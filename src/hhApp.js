const hhAppConfig = {

};

// model, utils and main funcs like init(), route(), openUrl(), etc
const hhApp = {
  // comicCache stores comics information
  // {
  //   [comicid]: {
  //     omicid: [comicid], coverImageUrl, comicUrl, comicTitle,
  // NOTICE: parser will get those above by fetchComicList(). and whole info by fetchComicInfo()
  //     comicBrief, comicAuthor, comciServerId, lastFetchTime,
  //     comicVolumns: { [volumnid]: { volumnTitle } , ... },
  // NOTICE: comicVolumns here only stores id and title
  //   },
  //   ...
  // }
  comicCache:           {},
  // every element contains a certain list of comicid, filled by fetchComicList()
  comicList:            { top100: [], sj100: [], history: [] },
  // these two object below should share same keys like [6. 8. 10],
  // fetched by fetchServerUrls(), used when generating comic pics url
  // which is a combination of relative serverUrl and what decoded by certain picListSalt
  serverUrls:           {},
  picListSalts:         {},

  // init the whole APP
  init() {
    // check browser to detemine if this APP can work properly
    // @TODO not done yet
    const browser = 0;
    if (browser == 1 ) {
      hhApp.showErrPage();
    }
    window.stop();
    GM_addStyle(hhAppWebpage.style);

    hhApp.initConfig();
    hhApp.initListener();
    hhApp.windowResizeHandler();
  },
  // init config, hhAppConfig will be used by the whole APP
  initConfig() {
    // TODO load custom config from localStorage
    const hhAppLocalConfig = {};
    Object.assign(hhAppConfig, hhAppDefaultConfig, hhAppLocalConfig);
  },
  // bind event
  initListener() {
    window.onpopstate = () => hhApp.route();
    window.onresize = () => hhApp.windowResizeHandler();
  },
  // recalculate sizes according to window, then route() to refresh the page
  windowResizeHandler() {
    // TODO const ww = window.innerWidth;
    // TODO const wh = window.innerHeight;

    hhApp.route();
  },
  //
  route(loc = window.location) {
    // to make sure an empty <doby> tag exists in the page
    if ($('body').length == 0) {
      $('<body>').appendTo($('html'));
    } else {
      $('body').empty();
    }

    if (loc.pathname == '/') {
      hhAppUI.showHomePage();
    } else {
      // router = [href, ('comic'|'xiee'|sth unkown), comicid, (undefined|'/'|string),
      //           volumnid, ('v=\d+\*'|undefined), pageid, serverid]
      const router = loc.href.match(hhAppConfig.reg_ComicHref);
      if (router == null) {
        // redirect to homepage if location is not href to a certain comic
        hhApp.openUrl(hhAppConfig.baseUrl);
      } else {
        const comicid    = router[2];
        const volumnid   = router[4];
        const pageid     = router[6] || 1;
        const serverid   = router[7];
        hhAppUI.showComic(comicid, volumnid, serverid, pageid);
      }
    }
  },
  // special open method, not using window.open for reducing request from server
  openUrl(url) {
    history.pushState(null, '', url);
    hhApp.route();
  },
  // find out if parent has a child structor as the depth indicates,
  // hasChild flag equals true means object deepest in depth should have child too
  // TODO need to be redesigned for using more convinently
  definedInDepth(parent, depth, hasChild = false) {
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
