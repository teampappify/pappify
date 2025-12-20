/**
 * Base class for Pappify plugins
 */
class Plugin {
  constructor(name) {
    this.name = name;
  }

  load(pappify) {
    throw new Error('Plugin must implement load() method');
  }

  unload(pappify) {
    // Optional cleanup
  }
}

module.exports = { Plugin };
