const hhAppUI = {
  // current comic list shown in homipage
  currentComicList:     'top100',
  // store slider's first cover's index of the list, used when routing back to homepage
  coverFirstIndex:       0,
  // store slider margin-left to slider-panel, used when routing back to homepage
  sliderMarginLeft:      0,

  // coverSlider instance
  $coverSlider:          {},

  // Err occurs somewhere
  showErrPage(showWholePage = true) {
    // Oops, app cannot recongnize this page
    if (showWholePage) {
      $('<span>Oops, app cannot recongnize this page!!!</span>').appendTo('body');
    }
  },

  // home page
  showHomePage() {
    $(hhAppWebpage.homePage).appendTo('body');
    // init coverSlider
    hhAppUI.$coverSlider = $('.list-slider-panel').hhAppCoverSlider(
      [],
      {
        _sliderMarginLeft: hhAppUI.sliderMarginLeft,
        _coverFirstIndex: hhAppUI.coverFirstIndex,
        // if not destory, animation function still works after routing
        _coverClickHandler: {
          func: coverUrl => {
            hhAppUI.coverFirstIndex = hhAppUI.$coverSlider.coverFirstIndex;
            hhAppUI.sliderMarginLeft = hhAppUI.$coverSlider.sliderMarginLeft;
            hhApp.openUrl(coverUrl);
          },
          destory: true
        },
      }
    );

    hhAppUI.refreshCoverSlider(false);
  },
  refreshCoverSlider(sliderReturn = true) {
    // fetch comic list from '/top100.htm' or '/sj100.htm' or history
    // if one has not been fetched yet
    hhAppParser.fetchComicList(hhAppUI.currentComicList).then(comicList => {
      hhAppUI.$coverSlider.changeList(comicList, sliderReturn);
    }, () => {});
  },
  showComic(comicid, pageid) {
    $(hhAppWebpage.comic).appendTo('body');
    const $imageSlider = $('.image-slider');
    for (let i = 0; i < 2; i++) {
      const $loadingImg = $(hhAppWebpage.image());
      $loadingImg.appendTo($imageSlider);
    }
    $('body').on('mousewheel', e => hhAppUI.sliderScroll(e.deltaY));

    // hhAppParser.fetchComicInfo(comicid).then(comicInfo => {
    //   const volumnid = Object.keys(comicInfo.comicVolumns)[0];
    //   const serverid = comicInfo.comicnServerId;
    //   hhAppParser.fetchVolumnPicListUrls(comicid, volumnid, serverid).then(
    //     re => hhAppParser.fetchPic(re[0]),
    //     () => {}
    //   );
    // }, () => {});
  },

  sliderScroll(direction) {
    $('.image-slider').css('margin-top', `-=${direction * hhAppConfig.scrollStep}`);
  },
};
