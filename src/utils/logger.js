const { createSpinner } = require('nanospinner');
const kleur = require('kleur');

const logger = {
    spinner: null, // Holds the spinner instance

    // Creates and starts a spinner
    startSpinner: (message) => {
        logger.spinner = createSpinner(message).start();
    },

    // Stops the spinner with a success message
    spinnerSuccess: (message) => {
        if (logger.spinner) {
            logger.spinner.success({ text: kleur.green().bold(`✔ ${message}`) });
            logger.spinner = null; // Reset spinner state
        }
    },

    // Stops the spinner with an error message
    spinnerError: (message) => {
        if (logger.spinner) {
            logger.spinner.error({ text: kleur.red().bold(`✖ ${message}`) });
            logger.spinner = null; // Reset spinner state
        }
    },

    // General info message
    info: (message) => console.log(kleur.cyan(message)),

    // Success message
    success: (message) => console.log(kleur.green().bold(`✔ ${message}`)),

    // Error message
    error: (message) => console.error(kleur.red().bold(`✖ ${message}`)),

    // Warning message
    warning: (message) => console.log(kleur.yellow().bold(`⚠ ${message}`)),

    // Logs a section title
    section: (title) => {
        console.log(kleur.cyan('━'.repeat(50)));
        console.log(kleur.bold().underline(title));
        console.log(kleur.cyan('━'.repeat(50)));
    },
    boldInfo: (message) => {
        console.log(kleur.magenta().bold(message));
    },

    // Divider for visual separation
    divider: () => console.log(kleur.dim('━'.repeat(50))),
};

module.exports = logger;
