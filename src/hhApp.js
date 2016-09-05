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

  // element contains a list of comicid
  comicList:            { top100: [], sj100: [], history: [] },
  // current comic list shown in homipage
  currentComicList:     'top100',
  //
  serverUrls:           {},
  serverEncodes:        {},
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
      hhAppParser.fetchTopComic(hhApp.currentComicList).then(() => {
        hhAppUI.showCoverSlider();
      }, () => {});
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
        const comicid    = router[2];
        const pageid     = router[3];
        hhAppUI.showComic(comicid, pageid); // (comicid, pageid)
        hhAppParser.fetchComicInfo(comicid).then(comicInfo => {
          const volumnid = comicInfo.comicVolumnInfo[0].comicVolumnId;
          const serverid = comicInfo.comicnServerId;
          hhAppParser.fetchVolumnImageUrls(comicid, volumnid, serverid).then(
            re => console.log(re),
            () => {}
          );
        }, () => {});
      }
    }
  },
  // spa open method
  openUrl(url) {
    history.pushState(null, '', url);
    hhApp.route();
  },
  //
  getComicsInfoByids(comicids) {
    return comicids.map(comicid => ({
      comicid,
      comicUrl: hhAppConfig.baseUrl + hhAppConfig.comicPageUrl(comicid),
      coverImageUrl: hhApp.comicCache[comicid].coverImageUrl,
      comicTitle: hhApp.comicCache[comicid].comicTitle,
    }));
  },
  definedInDepth(parent, depth, hasChild) {
    let _parent = parent;
    const _depth = typeof depth === 'string' ? [depth] : depth;
    for (let i = 0; i < _depth.length; i++) {
      const _child = _depth[i];
      if (!_parent.hasOwnProperty(_child)) return false;
      _parent = _parent[_child];
    }
    if (hasChild && Object.keys(parent).length == 0) return false;
    return true;
  },
};

hhApp.init();
