const bluebird = require('bluebird');

// Turn off warnings
bluebird.config({
    warnings: false
});

try {
    var fractal = path.resolve(process.cwd(), './fractal.js');
} catch (e) {
    var fractal = require('@frctl/fractal').create();
}

const logger = fractal.cli.console;

module.exports = class FractalWebpackPlugin {
    constructor(options = { mode: 'server', sync: true }) {
        this.options = options;
        this.serverStarted = false;
    }

    apply(compiler) {
        compiler.hooks.done.tap('FractalWebpackPlugin', () => {
            if (this.options.mode === 'server' && !this.serverStarted) {
                this.startServer();
                this.serverStarted = true;
            } else if (this.options.mode === 'build') {
                this.constructor.build();
            }
        });
    }

    /*
     * Start the Fractal server
     */
    startServer() {
        const server = fractal.web.server({
            sync: this.options.sync,
        });

        server.on('error', err => logger.error(err.message));

        return server.start().then(() => {
            // Code to make a nicer console output.
            const header = 'Fractal Web UI server is running!';
            const footer = fractal.cli.isInteractive() ? 'Use the \'stop\' command to stop the server.' : 'Use ^C to stop the server.';
            const serverUrl = server.urls.server;
            const format = str => logger.theme.format(str, 'success', true);
            let body = '';

            if (!server.isSynced) {
                body += `Local URL: ${format(serverUrl)}`;
            } else {
                const syncUrls = server.urls.sync;
                body += `Local URL:      ${format(syncUrls.local)}`;
                body += `\nNetwork URL:    ${format(syncUrls.external)}`;
                body += `\nBrowserSync UI: ${format(syncUrls.ui)}`;
            }

            return logger.box(header, body, footer).persist();
        });
    }

    /*
    * Run a static export of the project web UI.
    *
    * This will report on progress using the 'progress' event emitted by the
    * builder instance, and log any errors to the terminal.
    *
    * The build destination will be the directory specified in the 'builder.dest'
    * configuration option set above.
    */
    static build() {
        const builder = fractal.web.builder();

        builder.on('progress', (completed, total) => logger.update(`Exported ${completed} of ${total} items`, 'info'));
        builder.on('error', err => logger.error(err.message));

        return builder.build().then(() => {
            logger.success('Fractal build completed!');
        });
    }
};