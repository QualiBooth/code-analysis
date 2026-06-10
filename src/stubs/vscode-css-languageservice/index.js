'use strict'

// Stub for vscode-css-languageservice.
//
// The real package ships TypeScript-compiled UMD files whose internal
// require() calls are shadowed by a factory parameter, so ncc/webpack cannot
// statically resolve them and they crash with MODULE_NOT_FOUND at runtime.
//
// @html-eslint uses getCSSLanguageService() only to validate <link media="…">
// and <style media="…"> attribute values.  Returning a no-op service means
// those attributes are treated as always-valid, which is an acceptable
// trade-off for making HTML accessibility scanning work at all.

function makeService() {
  return {
    configure: () => {},
    parseStylesheet: () => ({}),
    doValidation: () => ([]),
    findDocumentHighlights: () => ([]),
    findDocumentLinks: () => ([]),
    findDocumentSymbols: () => ([]),
    doComplete: () => ({ isIncomplete: false, items: [] }),
    doHover: () => null,
    doRename: () => null,
    findDefinition: () => null,
    findReferences: () => ([]),
    findDocumentColors: () => ([]),
    getColorPresentations: () => ([]),
    doCodeActions: () => ([]),
    getFoldingRanges: () => ([]),
    getSelectionRanges: () => ([]),
    format: () => ([]),
  }
}

module.exports = {
  getCSSLanguageService: makeService,
  getSCSSLanguageService: makeService,
  getLESSLanguageService: makeService,
  getDefaultCSSDataProvider: () => ({}),
  newCSSDataProvider: () => ({}),
  ClientCapabilities: {},
  DiagnosticSeverity: { Error: 1, Warning: 2, Information: 3, Hint: 4 },
}
