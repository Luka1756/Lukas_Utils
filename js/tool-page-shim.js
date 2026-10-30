/* Tool pages load only one tool's markup but share script.js with the home page.
   script.js looks elements up by id/selector while it initialises; for tools that
   are not on this page, hand back a detached placeholder instead of null so the
   rest of the script still runs. Placeholders are never attached to the page. */
(function () {
  var byId = document.getElementById.bind(document);
  document.getElementById = function (id) {
    return byId(id) || document.createElement('input');
  };
  var qs = Element.prototype.querySelector;
  var dqs = Document.prototype.querySelector;
  Element.prototype.querySelector = function (s) { return qs.call(this, s) || document.createElement('div'); };
  Document.prototype.querySelector = function (s) { return dqs.call(this, s) || document.createElement('div'); };
})();
