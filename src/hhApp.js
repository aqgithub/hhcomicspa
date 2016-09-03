const hhApp = {
  imageWidth:            600,
  imageHeight:           800,
  scrollStep:            20,
  comicCache:            {},

  // index of list shwon in homepage
  listShowIndex:         0,
  // slider's first cover's index of the list
  coverFirstIndex:       0,
  // slider margin-left to slider-panel, used when routing back to homepage
  sliderMarginLeft:      0,

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
    GM_addStyle(hhAppWebpage.style);

    hhApp.initConfig();
    hhApp.listShowIndex = hhAppConfig.defaultListShowIndex;
    hhApp.initListener();
    hhApp.windowResizeHandler();
  },
  initConfig() {
    // load custom config from localStorage
    Object.assign(hhAppConfig, null);
  },
  // bind event
  initListener() {
    window.onpopstate = () => hhApp.route();
    window.onresize = () => hhApp.windowResizeHandler();
  },
  // calculate sizes according to window
  windowResizeHandler() {
    const ww = window.innerWidth;
    const wh = window.innerHeight;

    hhApp.route();
  },
  route(loc = window.location) {
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
        hhApp.comicList[index].length == 0 && hhAppParser.fetchTopComic(index).then(topComics => {
          hhApp.comicList[index] = topComics;
          index == hhApp.listShowIndex && hhAppUI.showCoverSlider();
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
