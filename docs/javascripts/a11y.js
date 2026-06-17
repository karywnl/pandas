// Give Material's dialogs and progress elements accessible names.
// These come from the theme itself (the search popup, the "copied to
// clipboard" toast), so we label them after each page load. document$ is
// provided by Material and also fires on instant navigation.
document$.subscribe(function () {
  document
    .querySelectorAll(
      '[role="dialog"]:not([aria-label]):not([aria-labelledby]),' +
      '[role="alertdialog"]:not([aria-label]):not([aria-labelledby])'
    )
    .forEach(function (el) {
      var isSearch = el.querySelector('input[type="search"]');
      el.setAttribute("aria-label", isSearch ? "Search" : "Notification");
    });

  document
    .querySelectorAll('[role="progressbar"]:not([aria-label]):not([aria-labelledby])')
    .forEach(function (el) {
      el.setAttribute("aria-label", "Loading");
    });
});
