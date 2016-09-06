const hhAppConfig = {

};

const hhApp = {
  comicCache:            {},
  // element contains a list of comicid
  comicList:            { top100: [], sj100: [], history: [] },
  //
  serverUrls:           {},
  picListSalts:         {},

  // current comic list shown in homipage
  currentComicList:     'top100',
  // slider's first cover's index of the list
  coverFirstIndex:       0,
  // slider margin-left to slider-panel, used when routing back to homepage
  sliderMarginLeft:      0,

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
    hhApp.initListener();
    hhApp.windowResizeHandler();
  },
  initConfig() {
    // load custom config from localStorage
    Object.assign(hhAppConfig, hhAppDefaultConfig, null);
  },
  // bind event
  initListener() {
    window.onpopstate = () => hhApp.route();
    window.onresize = () => hhApp.windowResizeHandler();
  },
  // calculate sizes according to window
  windowResizeHandler() {
    // @TODO const ww = window.innerWidth;
    // @TODO const wh = window.innerHeight;

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
    } else {
      // router = [pathname, ('comic'|'xiee'|sth unkown), comicid, pageid]
      const router = loc.pathname.match(hhAppConfig.reg_ComicPathname);
      if (router == null) {
        hhApp.openUrl(hhAppConfig.baseUrl);
      } else {
        const comicid    = router[2];
        const pageid     = router[3];
        hhAppUI.showComic(comicid, pageid);
      }
    }
  },
  // spa open method
  openUrl(url) {
    history.pushState(null, '', url);
    hhApp.route();
  },

  definedInDepth(parent, depth, hasChild) {
    let _parent = parent;
    const _depth = typeof depth === 'string' ? [depth] : depth;
    for (let i = 0; i < _depth.length; i++) {
      const _child = _depth[i];
      if (!_parent.hasOwnProperty(_child)) return false;
      _parent = _parent[_child];
    }
    if (hasChild) {
      if ( _parent instanceof Array) return _parent.length > 0;
      if (typeof _parent !== 'object') return false;
      return Object.keys(parent).length > 0;
    }
    return true;
  },
};

hhApp.init();
