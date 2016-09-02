// ==UserScript==
// @name        hhcomic
// @namespace   aq
// @include     http://www.hhcomic.cc*
// @include     http://hhcomic.cc*
// @require     https://code.jquery.com/jquery-3.1.0.min.js
// @require     http://cdn.bootcss.com/jquery-mousewheel/3.1.13/jquery.mousewheel.min.js
// @require     http://cdnjs.cloudflare.com/ajax/libs/velocity/1.2.3/velocity.min.js
// @version     1
// @description hh-series site imgs preload
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_openInTab
// @run-at      document-start
// ==/UserScript==

'use strict';

const hhAppConfig = {
  imageWidth:            600,
  imageHeight:           800,
  scrollStep:            20,
  coverStartIndex:       0,

  // list slider width (percent of whole window)
  listSliderWidthPer:    0.7,
  listSliderHeight:      280,

  // cover size of comic list shwon in homwpage
  // one cover is one image(img) in one container(ctn)
  listCoverImgWidth:     135,
  listCoverImgHeight:    180,
  listCoverCtnWidth:     170,
  listCoverCtnHeight:    210,
  // distance between two covers
  listCoverMargin:       30,

  // index of list shown in HomePage by default:
  // {0L top100, 1: sj100, 2: history, 3...}
  defaultListShowIndex:  0,

  topComic:              [],
  comicCache:            {},

  reg_TopComic:          /picbg.*width/g,
  reg_ComicPathname:     /^\/(comic|xiee)\/(\d+)\/($|\d+)/,

  baseUrl:               'http://www.hhcomic.cc/',
  topListUrl:            ['top100.htm', 'sj100.htm'],
};

const hhAppUI = {
  // a timer exec cover slider return to origin place if
  // no mousewheel event triggers in 1000ms after the last one
  coverListTimer:              null,
  // timer triggers intertial move
  coverListIntertialTimer:     null,

  // distance the slider has moved
  coverSliderMoveDistance:     0,

  //
  animating:                   false,
  // distance the slider auto pager on mousewheel several times
  coverSliderSlideDistance:    120,
  //
  coverSliderInertiaDistance:  40,
  //
  sliderLastDirection:         1,
  // distance the slider moves on mousewheel
  coverSliderStep:             20,

  // if cover slider can scroll towards certain direction
  coverSliderCanLeft:          true,
  coverSliderCanRight:         true,

  showErrPage(showWholePage = true) {
    // Oops, app cannot recongnize this page
    if (showWholePage) {
      $('<span>Oops, app cannot recongnize this page!!!</span>').appendTo('body');
    }
  },
  showHomePage() {
    $(hhAppWebpage.homePage).appendTo('body');
    hhAppUI.showComicList(true);
  },
  showComicList(forceShowList = false) {
    const listShow = hhApp.comicList[hhApp.listShowIndex];
    const $listPanel = $('.list-panel');
    const $listLoading = $('.list-loading');
    // infomation of list to be shown has not been loaded yet
    if (listShow.length == 0) {
      $listPanel.html(hhAppWebpage.listLoading);
      return false;
    }
    if (forceShowList || $listLoading.length > 0) {
      $listPanel.html(hhAppWebpage.listSliderPanel);

      // total number of covers. left and right covers may not exist
      // if there are not enough ones
      // |          |-------------------------  coverNumberTotal  ---------------------------|          |
      // | cover... | cover cover cover cover | cover cover cover  | cover cover cover cover | cover... |
      // |  may not |  overflow hidden        |  covers shown      |  overflow hidden        |  may not |
      // |  exist   |---- coverHiddenLeft ----|-- coverNumInList --|--- coverHiddenRight ----|  exist   |
      // |-----------  coverRestleft  --------|                    |-------  coverRestRight  -----------|
      // |          |                         | -------------------  coverRestNumInList  ---------------|

      // number of covers start from first showing one to the end of the list
      const coverRestNumInList = listShow.length - hhApp.coverFirstIndex;

      // plus one to make sure part of the overflow hidden is visible
      const coverHiddenMax = hhApp.coverNumMaxInList + 1;

      const coverRestLeft = hhApp.coverFirstIndex;
      const coverHiddenLeft = Math.min(coverHiddenMax, coverRestLeft);
      hhAppUI.coverSliderCanLeft = coverHiddenLeft > 0;

      const coverNumInList = Math.min(hhApp.coverNumMaxInList, coverRestNumInList);

      const coverRestRight = coverRestNumInList - coverNumInList;
      const coverHiddenRight = Math.min(coverHiddenMax, coverRestRight);
      hhAppUI.coverSliderCanRight = coverHiddenRight > 0;

      const coverNumberTotal = coverNumInList + coverHiddenLeft + coverHiddenRight;

      // push all cover elements of the slider into a string
      let coversHTML = '';
      for (let i = 0; i < coverNumberTotal; i++) {
        const coverInfo = listShow[i + hhApp.coverFirstIndex - coverHiddenLeft];
        coversHTML += hhAppWebpage.coverInList(
          coverInfo.coverImageUrl,
          coverInfo.comicTitle,
          coverInfo.comicUrl
        );
      }

      //
      const listSliderMarginLeft = hhApp.coverFirstMarginLeft -
        coverHiddenLeft * hhApp.coverCtnTakePlace;
      $('.list-slider')
        .html(coversHTML)
        .css({
          marginLeft: listSliderMarginLeft
        })
        .on('mousewheel', e => hhAppUI.coverListMouseWheelHandler(e.deltaY));

      $(`.cover-panel`).on('click', e => {
        hhApp.openUrl($(e.currentTarget).attr('data-url'));
      });
    }
  },
  coverListMouseWheelHandler(direction) {
    if (hhAppUI.animating) {
      return false;
    }
    // setup the timer, if no mousewheel event triggers in 1000ms
    // the slider auto returns
    clearTimeout(hhAppUI.coverListTimer);
    hhAppUI.coverListTimer = setTimeout(
      () => {
        hhAppUI.coverListSliderScroll();
        hhAppUI.coverSliderMoveDistance = 0;
      },
      1800
    );
    // ingore mousewheel speed > 2
    direction = direction > 0 ? 1 : -1;

    // interia move if no mousewheel event triggers in 80ms
    hhAppUI.sliderLastDirection = direction;
    clearTimeout(hhAppUI.coverListIntertialTimer);
    hhAppUI.coverListIntertialTimer = setTimeout(
      () => {
        const intertialDistance = hhAppUI.sliderLastDirection * hhAppUI.coverSliderInertiaDistance;
        hhAppUI.coverListSliderScroll(intertialDistance);
        hhAppUI.coverSliderMoveDistance += intertialDistance;
      },
      600
    );

    // slider moves over 20px, slider auto slide
    if (Math.abs(hhAppUI.coverSliderMoveDistance) >= hhAppUI.coverSliderSlideDistance) {
      if ((!hhAppUI.coverSliderCanLeft && direction == -1) ||
          (!hhAppUI.coverSliderCanRight && direction == 1)) {
        // reach the start or the end, slider auto returns
        hhAppUI.coverListSliderScroll();
        hhAppUI.coverSliderMoveDistance = 0;
      } else {
        // auto pager
        let coverIndexMove = hhApp.coverNumMaxInList;
        if (direction == -1 && hhApp.coverFirstIndex < hhApp.coverNumMaxInList) {
          coverIndexMove = hhApp.coverFirstIndex;
        }
        const coverDistanceMove = coverIndexMove * hhApp.coverCtnTakePlace - hhAppUI.coverSliderSlideDistance;
        hhAppUI.coverListSliderScroll(direction * coverDistanceMove, () => {
          hhApp.coverFirstIndex += direction * coverIndexMove;
          hhAppUI.coverSliderMoveDistance = 0;
          hhAppUI.showComicList(true);
        });
      }
    } else {
      hhAppUI.coverSliderMoveDistance += direction * hhAppUI.coverSliderStep;
      hhAppUI.coverListSliderScroll(direction * hhAppUI.coverSliderStep);
    }
  },
  coverListSliderScroll(distance = -hhAppUI.coverSliderMoveDistance, callback) {
    // const $listSlider = $('.list-slider').css({
    //   marginLeft: (index, mgLeft) => {
    //     return parseFloat(mgLeft) - distance;
    //   }
    // });
    hhAppUI.animating = true;
    const animateTime = Math.abs(distance) > 30 ? 1500 : 500;
    $('.list-slider').animate({
      marginLeft: `-=${distance}px`}, animateTime, 'swing', () => {
        hhAppUI.animating = false;
        callback && callback();
      }
    );
  },
};

const hhAppParser = {
  // topListIndex 0 -> '/top100.htm', 1 -> '/sj100.htm'
  fetchTopComic(topListIndex = 0) {
    return hhAppParser.GM_xhr_get(hhAppConfig.topListUrl[topListIndex]).then(
      topComicHTML => {
        // get String segments which contain comic infomatiom from HTML"/top100.htm"
        const topComicsInfo = topComicHTML.responseText.match(hhAppConfig.reg_TopComic);
        return topComicsInfo.map(info => {
          // split the info String into a temp array
          // will get useless infomation except for those listed in return
          const arr = info.split(`"`);
          return {
            coverImageUrl: arr[6],
            // sometimes title is encoded in the HTML
            comicTitle: arr[10].indexOf('%u') > -1 ? unescape(arr[10]): arr[10],
            comicUrl: `http://www.hhcomic.cc${arr[2]}`,
          }
        });
      },
      error => {
        return error;
      }
    );
  },
  // a promise version of GM_xmlhttpRequest GET
  GM_xhr_get(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url: hhAppConfig.baseUrl + url,
        method: 'GET',
        timeout: 20 * 1000,
        context: { resolve, reject },
        overrideMimeType: "text/html;charset=" + document.characterSet,
        onload: response => response.context.resolve(response),
        onerror: err => err.context.reject(err)
      })
    });
  },
};

const hhAppWebpage = {
  homePage: `
    <div class="covers"></div>
    <div class="search-panel">
      <input id="search-input" type="text" />
      <a class="search-btn">搜索漫画</a>
    </div>
    <div class="list-panel">
    </div>
  `,
  listLoading: `
    <div class="list-loading">
      loading...
    </div>
  `,
  listSliderPanel: `
    <div class="list-slider-panel">
      <div class="list-slider"></div>
    </div>
  `,
  coverInList(imageUrl, title, comicUrl) {
    const imageRotateDirection = Math.random() > 0.5 ? -1 : 1;
    const imageRotateDeg = Math.random() * 3 + 3;
    return `
      <div
        class="cover-panel"
        style="
          transform: rotate(${imageRotateDirection * imageRotateDeg}deg);
          width: ${hhAppConfig.listCoverCtnWidth}px;
          height: ${hhAppConfig.listCoverCtnHeight}px;
          margin-right: ${hhAppConfig.listCoverMargin}px
        "
        data-url=${comicUrl}
      >
        <img
          src=${imageUrl} alt="load error"
          style="
            width: ${hhAppConfig.listCoverImgWidth}px;
            height: ${hhAppConfig.listCoverImgHeight}px
          "
        />
        <span>${title}</span>
      </div>
    `
  },
  comic: `
    <div class="image-panel">
      <div class="image-slider"></div>
    </div>
  `,
  image(imageData) {
    return imageData ?
      `` :
      `
        <div class="loading-img" style="
          width: ${hhApp.imageWidth}px; height: ${hhApp.imageHeight}px"
        >
          <div class="loading-img-spinner">
            <div class="loading-img-bounce1"></div>
            <div class="loading-img-bounce2"></div>
            <div class="loading-img-bounce3"></div>
          </div>
        </div>
      `
  },
  style: `
    body,div,img,span,a,input {
      font: 14px/100% Arial, Helvetica, sans-serif;
      background: #f9f7f6;
      box-sizing: border-box;
    }
    html,body {
      text-align: center;
      height: 100%;
      padding: 0;
      margin: 0;
    }
    .loading-img {
      margin: 0 auto;
      background: #333333;
      text-align: center;
      border-top: 1px solid #333333;
    }
    .loading-img-spinner {
      margin: 50% auto 0;
      width: 150px;
      text-align: center;
      background: inherit;
      -moz-user-select: none;
      -webkit-user-select: none;
      user-select: none;
    }
    .loading-img-spinner > div {
      width: 30px;
      height: 30px;
      background-color: #67CF22;
      border-radius: 100%;
      display: inline-block;
      -webkit-animation: loading-img-bouncedelay 1.4s infinite ease-in-out;
      animation: loading-img-bouncedelay 1.4s infinite ease-in-out;
      /* Prevent first frame from flickering when animation starts */
      -webkit-animation-fill-mode: both;
      animation-fill-mode: both;
    }
    .loading-img-spinner .loading-img-bounce1 {
      -webkit-animation-delay: -0.32s;
      animation-delay: -0.32s;
    }
    .loading-img-spinner .loading-img-bounce2 {
      -webkit-animation-delay: -0.16s;
      animation-delay: -0.16s;
    }
    @-webkit-keyframes loading-img-bouncedelay {
      0%, 80%, 100% { -webkit-transform: scale(0.0) }
      40% { -webkit-transform: scale(1.0) }
    }
    @keyframes loading-img-bouncedelay {
      0%, 80%, 100% {
        transform: scale(0.0);
        -webkit-transform: scale(0.0);
      } 40% {
        transform: scale(1.0);
        -webkit-transform: scale(1.0);
      }
    }
    .image-panel {
      padding: 0 20px;
      display: inline-block;
      height: 100%;
      background: white;
      overflow: hidden;
      margin: 0 auto;
      position: relative;
    }
    .image-slider {
      background: white;
    }

    .search-panel {
      position: absolute;
      width: 40%;
      left: 30%;
      top: 35%;
    }
    #search-input {
      padding: 0.33em 0.25em;
      width: calc(100% - 5.4em);
      background: white;
      color: #AFB5BB;
      font-size: 1.5em;
      border: none;
    }
    #search-input:focus {
      box-shadow: 0 1px 2px rgba(0, 0, 0, .2);
    }
    .search-btn, .search-btn:visited {
      display: inline-block;
    	outline: none;
    	cursor: pointer;
    	text-align: center;
    	text-decoration: none;
    	padding: .75em 1.7em .75em;
    	text-shadow: 0 1px 1px rgba(0, 0, 0, .3);
    	box-shadow: 0 1px 2px rgba(0, 0, 0, .2);
      -moz-user-select: none;
      -webkit-user-select: none;
      user-select: none;
      position: relative;
	    top: -2px;
    }
    .search-btn:hover {
      text-shadow: 0 1px 2px rgba(0, 0, 0, .3);
    }
    .search-btn:active {
	    top: -1px;
    }

    /*  list-panel start  */
    .list-panel {
      width: 70%;
      position: absolute;
      left: 15%;
      top: 52%;
    }
    .list-slider-panel {
      overflow: hidden;
      white-space: nowrap;
      width: 100%;
      height: 240px;
    }
    .list-slider {
      margin-top: 20px;
    }
    .cover-panel {
      display: inline-block;
      position: relative;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      background: white;
      cursor: pointer;
      transition: transform 0.3s, width 0.3s, height 0.3s;
    }
    .cover-panel:hover {
      transform: rotate(0) !important;
      width: 198px;
      height: 264px;
      font-size: 1.5em;
      z-index: 199;
    }
    .cover-panel img {
      margin-top: 5px;
    }
    .cover-panel span {
      background: transparent;
      font-size: inherit;
      position: absolute;
      bottom:  calc(12px - 0.6em);
      left: 12px;
    }
    /*  list-panel end  */
  `
}

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
