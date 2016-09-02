const hhApp = {
  imageWidth:            600,
  imageHeight:           800,
  scrollStep:            20,
  comicCache:            {},

  // index of lisxt shwon in homepage
  listShowIndex:         0,

  // maxium number of covers the homepage list can contain
  coverNumMaxInList:     0,
  // first cover shown margin-left
  coverFirstMarginLeft:  0,
  // index of first cover shown in the list
  coverFirstIndex:       0,
  // width one cover container will take place
  coverCtnTakePlace:     0,

  // each element array represents certain list of comics:
  // 0 -> top100, 1 -> sj100, 2 -> history
  // each element of one element array stores infomation of certain comic
  // [[ { comicUrl, comicCoverUrl, comicTitle }, ... ], [ ... ], [ ... ], ]
  comicList:            [[], [], [],],

  //
  init() {
    // check browser
    const browser = 0;
    if (browser == 1 /* todo */) {
      hhApp.showErrPage();
    }

    window.stop();
    window.onpopstate = () => hhApp.route();
    window.onresize = () => hhApp.windowResizeHandler();
    GM_addStyle(hhAppWebpage.style);

    hhApp.initConfig();
    hhApp.listShowIndex = hhAppConfig.defaultListShowIndex;

    hhApp.windowResizeHandler();

    hhApp.route();
  },
  initConfig() {
    // load custom config from localStorage
    Object.assign(hhAppConfig, null);
  },
  // calculate sizes according to window
  windowResizeHandler() {
    const ww = window.innerWidth;
    const wh = window.innerHeight;

    // list slider panel width
    const listSliderWidth = ww * hhAppConfig.listSliderWidthPer;

    // width one cover container will take place
    hhApp.coverCtnTakePlace = hhAppConfig.listCoverCtnWidth + hhAppConfig.listCoverMargin;
    // maxium number of covers the homepage list can contain
    hhApp.coverNumMaxInList = Math.floor((listSliderWidth + hhAppConfig.listCoverMargin) / hhApp.coverCtnTakePlace);
    // first cover shown margin-left
    hhApp.coverFirstMarginLeft = (listSliderWidth + hhAppConfig.listCoverMargin) % hhApp.coverCtnTakePlace / 2;

    hhApp.route(undefined, true);
  },
  route(loc = window.location, forceRedraw = false) {
    // to make sure an empty <doby> tag exists in the page
    if ($('body').length == 0) {
      $('<body>').appendTo($('html'));
    } else {
      $('body').empty();
    }
    //
    if (loc.pathname == '/') {
      hhAppUI.showHomePage();
      // fetch top comic list from '/top100.htm' and '/sj100.htm'
      // if one has not been fetched yet
      [0, 1].forEach(index => {
        hhApp.comicList[index] == [] || hhAppParser.fetchTopComic(index).then(topComics => {
          hhApp.comicList[index] = topComics;
          hhAppUI.showComicList(forceRedraw);
        }, () => {});
      });
      // fetch history comic list from localStorage
      // each time when location changed
      // todo
      hhApp.comicList_history == [];
    } else {
      // router = [pathname, ('comic'|'xiee'|sth unkown), comicid, pageid]
      const router = loc.pathname.match(hhAppConfig.reg_ComicPathname);
      if (router == null) {
        hhApp.openUrl(hhAppConfig.baseUrl);
      } else {
        hhApp.showComic(router[2], router[3]); // (comicid, pageid)
      }
    }
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
    $('body').on('mousewheel', e => hhApp.sliderScroll(e.deltaY));
  },

  sliderScroll(direction) {
    $('.image-slider').css('margin-top', `-=${direction * hhApp.scrollStep}`);
  },

  openUrl(url) {
    history.pushState(null, '', url);
    hhApp.route();
  },
};

hhApp.init();
