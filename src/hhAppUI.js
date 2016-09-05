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
    const comicids = hhApp.comicList[hhApp.currentComicList];
    hhAppUI.$coverSlider = $('.list-slider-panel').hhAppCoverSlider(
      hhApp.getComicsInfoByids(comicids),
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
    const comicids = hhApp.comicList[hhApp.currentComicList];
    hhAppUI.$coverSlider.changeList(hhApp.getComicsInfoByids(comicids));
  },
  showComic(comicid, pageid) {
    // if (comicid == null) {
    //   hhAppUI.showErrPage();
    // }
    $(hhAppWebpage.comic).appendTo('body');
    const $imageSlider = $('.image-slider');
    for (let i = 0; i < 2; i++) {
      const $loadingImg = $(hhAppWebpage.image());
      $loadingImg.appendTo($imageSlider);
    }
    $('body').on('mousewheel', e => hhAppUI.sliderScroll(e.deltaY));
  },

  sliderScroll(direction) {
    $('.image-slider').css('margin-top', `-=${direction * hhApp.scrollStep}`);
  },
};
