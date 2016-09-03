const hhAppUI = {
  $coverSlider: {},
  showErrPage(showWholePage = true) {
    // Oops, app cannot recongnize this page
    if (showWholePage) {
      $('<span>Oops, app cannot recongnize this page!!!</span>').appendTo('body');
    }
  },
  showHomePage() {
    $(hhAppWebpage.homePage).appendTo('body');
    hhAppUI.$coverSlider = $('.list-slider-panel').hhAppCoverSlider(
      hhApp.comicList[hhApp.listShowIndex],
      {
        _sliderMarginLeft: hhApp.sliderMarginLeft,
        _coverFirstIndex: hhApp.coverFirstIndex,
        // if not destory, animation function still works after routing
        _coverClickHandler: {
          func: coverUrl => {
            hhApp.coverFirstIndex = hhAppUI.$coverSlider.coverFirstIndex;
            hhApp.sliderMarginLeft = hhAppUI.$coverSlider.sliderMarginLeft;
            hhApp.openUrl(coverUrl);
          },
          destory: true
        },
      }
    );
  },
  showCoverSlider() {
    hhAppUI.$coverSlider.changeList(hhApp.comicList[hhApp.listShowIndex]);
  }
};
