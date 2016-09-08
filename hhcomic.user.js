// ==UserScript==
// @name        hhcomic
// @namespace   aq
// @include     http://www.hhcomic.cc*
// @include     http://hhcomic.cc*
// @require     https://code.jquery.com/jquery-3.1.0.slim.min.js
// @require     http://cdn.bootcss.com/jquery-mousewheel/3.1.13/jquery.mousewheel.min.js
// @version     1
// @description hh-series site imgs preload
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_openInTab
// @run-at      document-start
// ==/UserScript==

'use strict';

const hhAppDefaultConfig = {
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

  reg_TopComic:          /picbg.+width/g,
  reg_ComicInfo:         /comicui[\d\D]+table>/,
  reg_ComicInfoTitle:    /作者：(.+)汗汗/,
  reg_ComicInfoBref:     /线上漫画,([\d\D]+)汗汗漫画/,
  reg_ComicVolumnLis:    /\/xiee\/(.+?)<\/a>/g,
  reg_ComicVolumnLi:     /(\d+)\.htm\?s=(\d+).*k>(.+)</,
  reg_VolumnPicList:     /PicListUrl = "(.+?)"/,
  reg_ServerJsIndex:     /hh\/(\d+)\.js/,
  reg_ServerList:        /ServerList\[\d+\]="(.+?)";/g,
  reg_ServerEncode:      /PicListUrl,"(.+?)"/,
  reg_ComicPathname:     /^\/(comic|xiee)\/(\d+)($|\/$|\/\d+)/,

  // catalog volumns, sort showing order as setting
  volumnCatalogOrder:    ['集', '卷', '篇'],

  baseUrl:               'http://www.hhcomic.cc/',
  coverBaseUrl:          'http://imgs.hhxiee.net/',
  comicListUrl:          comicListType => ({ top100: 'top100.htm', sj100: 'sj100.htm' }[comicListType]),
  serverJsUrl:           serverJsIndex => `hh/${serverJsIndex}.js`,
  volumnUrl:             (comicid, volumnid, serverid) => `xiee/${comicid}/${volumnid}.htm?s=${serverid}`,
  comicPageUrl:          comicid => `comic/${comicid}`,
};

!(() => {
  $.fn.hhAppCoverSlider = function(coverList = [], _sliderParams = { }) {
    // get params
    const {
      _coverImgWidth,           // cover image width
      _coverImgHeight,          // cover image height
      _coverPanelWidth,         // cover div surrond  image
      _coverPanelHeight,        // cover div surrond image
      _coverMargin,             // cover panel margin between each other
      _nullListHTML,            // html content of returning slider if coverList is null
      _coverFirstIndex,         // first cover of the slider's index of the list, by default
      _sliderMarginLeft,        // slider margin left to $parent, by default
      _coverClickHandler,       // callback when click on cover images
      animationStepPX,          // distance (px) the slider moves on mousewheel once
    }                           = _sliderParams;
    // set params to default if undefined
    const coverImgWidth         = _coverImgWidth || 135;
    const coverImgHeight        = _coverImgHeight || 180;
    const coverPanelWidth       = _coverPanelWidth || 170;
    const coverPanelHeight      = _coverPanelHeight || 210;
    const coverMargin           = _coverMargin || 30;
    const nullListHTML          = _nullListHTML || '<div class="list-loading">loading...</div>';
    const coverClickHandler     = _coverClickHandler || { func: (e => alert(e)), destory: false };
    const _animationStepPX      = animationStepPX || 220;

    // cover take place
    const coverTakePlace        = coverPanelWidth + coverMargin;
    // parent node of the slider
    const $parent               = $(this) || $('body');
    // number of covers in the slider
    let coverCountSlider        = 0;
    // maxium covers the slider can contain
    let coverCountMax           = 0;
    // number of covers in the entire list
    let coverCountTotal         = 0;
    // distance the slider will move in animation
    let moveDistance            = 0;
    // slider margin-left before animation start
    let moveStart               = 0;
    // slider width, inherit from its parent node
    let sliderWidth             = 0;
    // slider cannot move if all covers visible in the screen
    let sliderCanMove           = true;
    // a increment number recording time animation used
    let animationTime           = 0;
    // total animation time
    let animationDuration       = 60;
    // return object of this class
    let $slider                 = $('<div>')
                                    .addClass('list-slider')
                                    .appendTo($parent);
    // slider filled with covers in the list, true
    let sliderFilled            = false;
    // sotres current slider position, used for re-route
    $slider.coverFirstIndex     =  _coverFirstIndex || 0;
    $slider.sliderMarginLeft    =  _sliderMarginLeft || 0;
    // list stores covers infomation
    let _coverList              = coverList;

    // todo, not work properly
    $slider.startAnimation = () => {
      if (sliderFilled) {
        // slider animation function, call by requestAnimationFrame
        $slider.sliderAnimation = () => {
          if (moveDistance != 0 && animationTime < animationDuration) {
            animationTime++;
            // after one tick, slider margin-left change to moveTo
            // twween
            //        animationTime     : deltaT, increment 1 on 1 tick
            //        moveStart         : margin-left at animation start,
            //        moveDistance      : margin-left value be added when animation done,
            //        animationDuration : totalT, animationTime finally reach this
            const moveTo = Math.tween.Quart.easeOut(
              animationTime,
              moveStart,
              moveDistance,
              animationDuration
            );
            // 0 means reaching right end, slider should cut off right 1 cover,
            // and add one to the left, so sth can show if move further rught
            if (moveTo > 0) {
              // no cover can be added to the left, because first left cover
              // in the slider is fitst element in the list, so stop animation by
              // set params to 0
              if ($slider.coverFirstIndex == 0) {
                animationTime = 0;
                moveDistance = 0;
                $slider.css('marginLeft', 0);
                requestAnimationFrame($slider.sliderAnimation);
                return false;
              }
              $slider.coverFirstIndex--;
              fillSlider();
              // after slider dom operatiion, reset its margin-left to
              // make it seems like not changed
              $slider.css('marginLeft', `-=${coverTakePlace}px`);
              moveStart -= coverTakePlace;
              requestAnimationFrame($slider.sliderAnimation);
              return false;
            }
            // reach the left border, moveTo smaller than minMarginLeft,
            // blank appears to the right side of the slider
            // |------ slider real width, including invisible part ------|
            // |- coverTakePlace -|--- several ...- --|- coverTakePlace -|
            // |inherit from panel ==> |--------  sliderWidth  ----------|
            // |---- minMarginLeft ----| <== Obviously a negetive number |
            const minMarginLeft = sliderWidth - coverTakePlace * coverCountSlider;
            if (Math.floor(moveTo) < Math.floor(minMarginLeft)){
              // last cover of the slider is the last one of the list
              if ($slider.coverFirstIndex + coverCountSlider == coverCountTotal) {
                animationTime = 0;
                moveDistance = 0;
                $slider.css('marginLeft', `${minMarginLeft}px`);
                requestAnimationFrame($slider.sliderAnimation);
                return false;
              }
              $slider.coverFirstIndex++;
              fillSlider();
              // similar as above
              $slider.css('marginLeft', `+=${coverTakePlace}px`);
              moveStart += coverTakePlace;
              requestAnimationFrame($slider.sliderAnimation);
              return false;
            }
            $slider.css({ marginLeft: moveTo });
          }
          requestAnimationFrame($slider.sliderAnimation);
        };
        $slider.sliderAnimation();
      }
      return $slider;
    };

    $slider.stopAnimation = () => {
      sliderFilled && ($slider.sliderAnimation = () => {});
      return $slider;
    };

    $slider.destorySlider = () => {
      $slider.stopAnimation();
      $slider.empty();
      return true;
    };

    $slider.changeList = (newCoverList = [], sliderReturn = true) => {
      // if new cover list smaller than old one, previous position
      // may cause slider invisible
      if (sliderReturn) {
        $slider.coverFirstIndex = 0;
        $slider.sliderMarginLeft = 0;
      }
      return createSlider(newCoverList);
    };
    // change covers list
    const createSlider = (coverList = []) => {
      $slider.destorySlider();
      // what will return if coverList has no element
      if (coverList.length == 0) {
        // no covers in the list, return slider containing warning html
        sliderFilled = false;
        $slider.html(nullListHTML);
        return $slider;
      }

      _coverList = coverList;
      calc();
      fillSlider();
      sliderFilled = true;
      return $slider.css('marginLeft', `${$slider.sliderMarginLeft}px`).startAnimation();
    };

    // recalc when window resize
    const calc = () => {
      sliderWidth        = $parent.width();
      coverCountTotal    = _coverList.length;
      // plus 2 to make sure part of covers on both sides visible
      coverCountMax      = Math.floor(sliderWidth / coverTakePlace) + 2;
      // number of covers in the list greater than slider can show,
      // so user can move the slider to view the whole list
      sliderCanMove      = coverCountTotal > coverCountMax - 1;
      //
      coverCountSlider   = sliderCanMove ? coverCountMax : coverCountTotal;
    };

    const mousewheelHandler = (direction) => {
      if (sliderCanMove) {
        animationTime = 0;
        moveDistance = direction * _animationStepPX;
        moveStart = Math.floor($slider.css('marginLeft').replace(/px/, ''));
      }
    };

    // generate slider html
    const fillSlider = () => {
      // push all cover elements of the slider into a string
      let sliderHTML = '';
      for (let i = 0; i < coverCountSlider; i++) {
        const coverInfo = _coverList[i + $slider.coverFirstIndex];
        // cover-panel rotate random degree, range: (-6, -3) U (3, 6)
        const imageRotateDirection = Math.random() > 0.5 ? -1 : 1;
        const imageRotateDeg = Math.random() * 3 + 3;
        const coverPanelHTML =  `
          <div
            class="cover-panel"
            style="
              transform: rotate(${imageRotateDirection * imageRotateDeg}deg);
              width: ${coverPanelWidth}px;
              height: ${coverPanelHeight}px;
              margin-right: ${coverMargin}px
            "
            data-url=${coverInfo.comicUrl}
          >
            <img
              src=${coverInfo.coverImageUrl} alt="load error"
              style="
                width: ${coverImgWidth}px;
                height: ${coverImgHeight}px
              "
            />
            <span>${coverInfo.comicTitle}</span>
          </div>
        `;
        sliderHTML += coverPanelHTML;
      }
      $slider.html(sliderHTML);

      $('.cover-panel').on('click', e => {
        $slider.sliderMarginLeft = $slider.css('marginLeft').replace(/px/, '');
        coverClickHandler.destory && $slider.destorySlider();
        coverClickHandler.func($(e.currentTarget).attr('data-url'));
      });
    };

    //
    createSlider(_coverList);
    // bind handler
    $parent.on('mousewheel', e => mousewheelHandler(e.deltaY));

    return $slider;
  };
})();

const hhAppParser = {
  // forceRefetch: ignore existence in the store list, force fetching
  // fetchAndReplace: modify the store list after fetching
  fetchComicList(comicListType = 'top100', forceRefetch = false, fetchAndReplace = true) {
    // if exist and not forceRefetch, directly return what stored in the list
    if (hhApp.definedInDepth(hhApp.comicList, comicListType, true) && !forceRefetch) {
      const comicids = hhApp.comicList[comicListType];
      return Promise.resolve(comicids.map(comicid => ({
        comicid,
        comicUrl: hhAppConfig.baseUrl + hhAppConfig.comicPageUrl(comicid),
        coverImageUrl: hhApp.comicCache[comicid].coverImageUrl,
        comicTitle: hhApp.comicCache[comicid].comicTitle,
      })));
    }
    return hhAppParser.GM_xhr_get(hhAppConfig.comicListUrl(comicListType)).then(
      _comicListHTML => {
        const comicListHTML = _comicListHTML.responseText;
        let comicList = [];
        // get String segments which contain comic infomatiom from HTML"/top100.htm"
        if (comicListType == 'top100' || comicListType == 'sj100') {
          const topComicsInfo = comicListHTML.match(hhAppConfig.reg_TopComic);
          comicList = topComicsInfo.map(info => {
            // split the info String into a temp array
            // will get useless infomation except for those listed in return
            const arr = info.split(`"`);
            const comicid = arr[2].match(/\d+/)[0];
            const comicTitle = arr[10].indexOf('%u') > -1 ? unescape(arr[10]): arr[10];
            const coverImageUrl = arr[6];
            return {
              comicid,
              coverImageUrl,
              comicTitle,
              comicUrl: hhAppConfig.baseUrl + hhAppConfig.comicPageUrl(comicid),
            };
          });
        }
        if (fetchAndReplace) {
          hhApp.comicList[comicListType] = [];

          comicList.forEach(comicInfo => {
            const comicid = comicInfo.comicid;
            hhApp.comicList[comicListType].push(comicid);

            if (hhApp.comicCache.hasOwnProperty(comicid)) {
              Object.assign(hhApp.comicCache[comicid], comicInfo);
            } else {
              Object.assign(hhApp.comicCache, {
                [comicid]: comicInfo,
              });
            }
          });
        }
        return comicList;
      },
      error => {
        return error;
      }
    );
  },
  fetchComicInfo(comicid, forceRefetch = false, fetchAndReplace = true) {
    if (hhApp.definedInDepth(hhApp.comicCache, [comicid, 'comicVolumns'], true) && !forceRefetch) {
      return Promise.resolve(hhApp.comicCache[comicid]);
    }
    return hhAppParser.GM_xhr_get(hhAppConfig.comicPageUrl(comicid)).then(
      _comicPageHTML => {
        const comicPageHTML = _comicPageHTML.responseText;
        // reg to geta long string containing title, coverUrl, brief, author,
        // and useless part, which will be dropped by spliting the string
        const comicInfoSplit  = comicPageHTML.match(hhAppConfig.reg_ComicInfo)[0].split('"');
        //
        const coverImageUrl   = hhAppConfig.coverBaseUrl + comicInfoSplit[0];
        const comicTitle      = comicInfoSplit[2];
        const comicAuthor     = comicInfoSplit[15].match(hhAppConfig.reg_ComicInfoTitle)[1];
        const comicBrief      = comicInfoSplit[21].match(hhAppConfig.reg_ComicInfoBref)[1];
        //
        const lastFetchTime   = new Date().getTime();
        // collection of <li> tag containing volumns info
        const comicVolumnLis  = comicPageHTML.match(hhAppConfig.reg_ComicVolumnLis);
        // volumn server, constant in the same comic
        let comicnServerId    = 0;
        let comicVolumns      = {};
        comicVolumnLis.forEach(comicVolumnLi => {
          const arr = comicVolumnLi.match(hhAppConfig.reg_ComicVolumnLi);
          comicnServerId = arr[2];
          const volumnid = arr[1];
          const volumnTitle = arr[3];
          Object.assign(comicVolumns, {
            [volumnid]: {
              volumnTitle
            }
          });
        });
        const comicInfo = {
          coverImageUrl,
          comicTitle,
          comicAuthor,
          comicBrief,
          comicnServerId,
          comicVolumns,
          lastFetchTime,
        };
        if (fetchAndReplace) {
          Object.assign(hhApp.comicCache, {
            [comicid]: comicInfo,
          })
        }
        return comicInfo;
      },
      error => {
        return error;
      }
    )
  },
  fetchVolumnPicListUrls(comicid, volumnid, serverid, forceRefetch = false, fetchAndReplace = true) {
    if (hhApp.definedInDepth(hhApp.comicCache, [comicid, 'comciVolumns', volumnid, 'imageids'], true) && !forceRefetch) {
      return Promise.resolve(hhApp.comicCache[comicid].comicVolumns[volumnid].imageids);
    }
    return hhAppParser.GM_xhr_get(hhAppConfig.volumnUrl(comicid, volumnid, serverid)).then(
      _volumnHTML => {
        const volumnHTML        = _volumnHTML.responseText;
        // volumnPicList is long string like 'abczfgzghzjazjjaz...'
        // get salt(picListSalt) 'abcdefghjkz' from [serverJsIndex].js
        // replace each character in the long string by char's index in the salt
        // notice the char 'z' in the salt, not replace it, but use it as a split flag
        // then split the replaced string by the flag and will get an array like:
        // [123, 78, ....], it is an ascii code array. get chars and join the array
        // will get `[imgUrl]|[imgUlr]...`, split it by '|'
        // get baseurl from [serverJsIndex].js, join it to [imgUrl] to get complete urls
        let volumnPicList       = volumnHTML.match(hhAppConfig.reg_VolumnPicList)[1];
        const serverJsIndex     = volumnHTML.match(hhAppConfig.reg_ServerJsIndex)[1];
        return hhAppParser.fetchServerUrls(serverJsIndex, serverid).then(
          ({ serverUrl, picListSalt }) => {
            for (let i = 0; i < 10; i++) {
              const reg = new RegExp(`${picListSalt.charAt(i)}`, 'g');
              volumnPicList = volumnPicList.replace(reg, i);
            }
            const volumnPicListSplit  = volumnPicList.split(picListSalt.charAt(10));
            const volumnPicListDecode = volumnPicListSplit.map(asc => String.fromCharCode(asc)).join('');
            const volumnPicListUrls   = volumnPicListDecode.split('|').map(url => serverUrl + url);
            if (fetchAndReplace) {
              // @TODO store pic urls list
            }
            return volumnPicListUrls;
          },
          () => {}
        )
      },
      () => {}
    );
  },
  fetchServerUrls(serverJsIndex, serverid) {
    if (hhApp.serverUrls.hasOwnProperty(serverJsIndex)) {
      return Promise.resolve({
        serverUrl: hhApp.serverUrls[serverJsIndex][serverid - 1],
        picListSalt: hhApp.picListSalts[serverJsIndex],
      });
    }
    return hhAppParser.GM_xhr_get(hhAppConfig.serverJsUrl(serverJsIndex)).then(
      _serverJsHTML => {
        const serverJsHTML  = _serverJsHTML.responseText;
        const picListSalt   = serverJsHTML.match(hhAppConfig.reg_ServerEncode)[1];
        let serverMatch     = '';
        let serverUrls      = [];
        while ((serverMatch = hhAppConfig.reg_ServerList.exec(serverJsHTML)) != null) {
          serverUrls.push(serverMatch[1]);
        }
        Object.assign(hhApp.serverUrls, {
          [serverJsIndex]: serverUrls
        });
        Object.assign(hhApp.picListSalts, {
          [serverJsIndex]: picListSalt
        });
        return {
          serverUrl: serverUrls[serverid - 1],
          picListSalt,
        };
      },
      () => {}
    );
  },
  fetchPic(picUrl) {
    return hhAppParser.GM_xhr_get(picUrl, '', {
      overrideMimeType: '',
      responseType: 'blob',
    }).then(
      picData => {
        $('<img>').attr('src', window.URL.createObjectURL(picData.response)).appendTo('body');
      },
      () => {}
    );
  },
  // a promise version of GM_xmlhttpRequest GET
  GM_xhr_get(url, baseUrl = hhAppConfig.baseUrl, xhrOptions) {
    return new Promise((resolve, reject) => {
      const _xhrOptions = Object.assign({
        url: baseUrl + url,
        method: 'GET',
        timeout: 20 * 1000,
        context: { resolve, reject },
        overrideMimeType: 'text/html;charset=' + document.characterSet,
        onload: response => response.context.resolve(response),
        onerror: err => err.context.reject(err),
      }, xhrOptions);
      GM_xmlhttpRequest(_xhrOptions);
    });
  },
};

!(() => {
  $.fn.hhAppPicViewer = function(picList = [], viewerParams = { }) {
    // get params
    const {
      customPicWidth,           // user defined pic width, user cannot define pic height
      isShoWHeader,             // show header or not
      headerHeight,             // header height
      isShowFooter,             // show footer or not
      footerHeight,             // footer height
      loadingHTML,              // html content of returning slider if coverList is null
      errorHTML,                // html content if error occurs
      askForPics,               // function ask for more pic, if there is not enough to show
      viewerMode,               // ('mutli' | 'single')
      maxMarginLeft,            // pic max margin-left to pic-panel
      animationStepPX,          // distance (px) the slider moves on mousewheel once, in 'single' mode
    }                           = viewerParams;
    // set params to default if undefined
    const _customPicWidth       = customPicWidth || 600;
    const _isShowHeader         = isShoWHeader || true;
    const _headerHeight         = headerHeight || 30;
    const _isShowFooter         = isShowFooter || true;
    const _footerHeight         = footerHeight || 30;
    const _loadingHTML          = loadingHTML ||
                                    `
                                      <div class="loading-img">
                                        <div class="loading-img-spinner">
                                          <div class="loading-img-bounce1"></div>
                                          <div class="loading-img-bounce2"></div>
                                          <div class="loading-img-bounce3"></div>
                                        </div>
                                      </div>
                                    `;
    const _errorHTML            = errorHTML || '<span>error</span>';
    const _viewerMode           = viewerMode || 'custom';
    const _maxMarginLeft        = maxMarginLeft || 30;
    const _animationStepPX      = animationStepPX || 60;
    // parent node of the slider
    const $parent               = $(this) || $('body');

    // pic List contains pics as Image instance
    let _picList                = picList;

    let  HFTakePlace            = _isShowHeader * _headerHeight + _isShowFooter * _footerHeight;
    let  winW                   = window.innerWidth;
    let  winH                   = window.innerHeight;
    // sum of all pics display height
    let _totalHeight            = 0;
    // loading div display width and height, and its margin-left to pic-panel
    let _loadingDisplayH        = 0;
    let _loadingDisplayW        = 0;
    let _loadingMarginLeft      = 0;

    // distance the slider will move in animation
    let moveDistance            = 0;
    // slider margin-left before animation start
    let moveStart               = 0;
    // slider width, inherit from its parent node
    let sliderCanMove           = true;
    // a increment number recording time animation used
    let animationTime           = 0;
    // total animation time
    let animationDuration       = 60;

    // return object of this class
    let $viewer                 = $('<div>')
                                    .addClass('pic-viewer')
                                    .appendTo($parent);

    $viewer.bar                 = 'bar';

    $viewer.startAnimation = () => {

    };

    $viewer.stopAnimation = () => {

    };

    $viewer.destoryViewer = () => {
      $viewer.stopAnimation();
    };

    const _askForPics = (startPicOffset, picCount) => askForPics(startPicOffset, picCount).then(
      picList => {
        _picList = picList;
        createViewer();
      },
      () => {}
    );

    const fillViewer = () => {
      let picHTML = '<div class="pic-list-panel">';
      let hasPicToLoad = false;
      _picList.forEach(pic => {
        picHTML += `<div class="pic-panel" >`;
        if (pic == 'loading') {
          picHTML += _loadingHTML;
        } else {
          hasPicToLoad = true;
          picHTML += `<img src="${pic.dataUrl}" width="${pic.displayW}" height="${pic.displayH}" />`;
        }
      });
      if (hasPicToLoad) {
        _askForPics(0, _picList.length);
      }
    };


    const calc = () => {
      HFTakePlace     = _isShowHeader * _headerHeight + _isShowFooter * _footerHeight;
      winW            = window.innerWidth;
      winH            = window.innerHeight;
      _totalHeight    = 0;

      _picList.map(pic => {
        if (pic == 'loaindg') return false;
        const picW = pic.width;
        const picH = pic.Height;
        let thisPicDisplayW = _customPicWidth;
        let thisPicDisplayH = _customPicWidth / picW * picH;
        // pic height = window height, notice pic width has a limit as window width
        if (_viewerMode == 'single') {
          thisPicDisplayH = winH - HFTakePlace;
          thisPicDisplayW = thisPicDisplayH / picH * picW;
          if (thisPicDisplayW > winW) {
            thisPicDisplayW = winW;
            thisPicDisplayH = thisPicDisplayW / picW * picH;
          }
        }

        const remainWidth = Math.max(0, winW - thisPicDisplayW);
        const picMarginLeft = Math.min(_maxMarginLeft, remainWidth / 2);
        pic.displayW = thisPicDisplayW;
        pic.displayH = thisPicDisplayH;
        pic.marginLeft = picMarginLeft;
        _totalHeight += (thisPicDisplayH + HFTakePlace);
        return true;
      });

      _loadingDisplayH = winH - HFTakePlace;
      _loadingDisplayW = _customPicWidth;
      _loadingMarginLeft = Math.min(_maxMarginLeft, Math.max(0, winW - _loadingDisplayW) / 2);
      // not enough pic to show, often ocurrs on window resize
      if (_totalHeight < winH) {
        const loadingTakePlace = _loadingDisplayH + HFTakePlace;
        // append loading pics to make sure the screen is fulfilled in Vertical
        const appendCount = Math.ceil((winH - _totalHeight) / loadingTakePlace);
        _totalHeight += (appendCount * loadingTakePlace);
        _picList = [..._picList, ...(new Array(appendCount).fill('loading'))];
      }
    };

    const mousewheelHandler = direction => {
      if (viewerMode == 'single') {
        moveDistance = winH * (direction > 0 ? 1 : -1);
      } else {
        moveDistance = animationStepPX * direction;
      }

    };

    const createViewer = () => {
      $viewer.destoryViewer();
      if (askForPics === undefined) {
        $viewer.html(_errorHTML);
        return $viewer;
      }

      calc();
      fillViewer();
      return $viewer;
    };
    createViewer();
    $parent.on('mousewheel', e => mousewheelHandler(e.deltaY));
    return $viewer;
  };
})();

const hhAppTween = {
  Linear: (t, b, c, d) => { return c*t/d + b; },
  Quad: {
    easeIn: (t, b, c, d) => {
      return c * (t /= d) * t + b;
    },
    easeOut: (t, b, c, d) => {
      return -c *(t /= d)*(t-2) + b;
    },
    easeInOut: (t, b, c, d) => {
      if ((t /= d / 2) < 1) return c / 2 * t * t + b;
      return -c / 2 * ((--t) * (t-2) - 1) + b;
    }
  },
  Cubic: { 
    easeIn: (t, b, c, d) => {
      return c * (t /= d) * t * t + b;
    },
    easeOut: (t, b, c, d) => {
      return c * ((t = t/d - 1) * t * t + 1) + b;
    },
    easeInOut: (t, b, c, d) => {
      if ((t /= d / 2) < 1) return c / 2 * t * t*t + b;
      return c / 2*((t -= 2) * t * t + 2) + b;
    }
  },
  Quart: {
    easeIn: (t, b, c, d) => {
      return c * (t /= d) * t * t*t + b;
    },
    easeOut: (t, b, c, d) => {
      return -c * ((t = t/d - 1) * t * t*t - 1) + b;
    },
    easeInOut: (t, b, c, d) => {
      if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
      return -c / 2 * ((t -= 2) * t * t*t - 2) + b;
    }
  },
  Quint: {
    easeIn: (t, b, c, d) => {
      return c * (t /= d) * t * t * t * t + b;
    },
    easeOut: (t, b, c, d) => {
      return c * ((t = t/d - 1) * t * t * t * t + 1) + b;
    },
    easeInOut: (t, b, c, d) => {
      if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
      return c / 2*((t -= 2) * t * t * t * t + 2) + b;
    }
  },
  Sine: {
    easeIn: (t, b, c, d) => {
      return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
    },
    easeOut: (t, b, c, d) => {
      return c * Math.sin(t/d * (Math.PI/2)) + b;
    },
    easeInOut: (t, b, c, d) => {
      return -c / 2 * (Math.cos(Math.PI * t/d) - 1) + b;
    }
  },
  Expo: {
    easeIn: (t, b, c, d) => {
      return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
    },
    easeOut: (t, b, c, d) => {
      return (t==d) ? b + c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
    },
    easeInOut: (t, b, c, d) => {
      if (t==0) return b;
      if (t==d) return b+c;
      if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
      return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
    }
  },
  Circ: {
    easeIn: (t, b, c, d) => {
      return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
    },
    easeOut: (t, b, c, d) => {
      return c * Math.sqrt(1 - (t = t/d - 1) * t) + b;
    },
    easeInOut: (t, b, c, d) => {
      if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
      return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
    }
  },
  Elastic: {
    easeIn: (t, b, c, d, a, p) => {
      var s;
      if (t==0) return b;
      if ((t /= d) == 1) return b + c;
      if (typeof p == "undefined") p = d * .3;
      if (!a || a < Math.abs(c)) {
        s = p / 4;
        a = c;
      } else {
        s = p / (2 * Math.PI) * Math.asin(c / a);
      }
      return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
    },
    easeOut: (t, b, c, d, a, p) => {
      var s;
      if (t==0) return b;
      if ((t /= d) == 1) return b + c;
      if (typeof p == "undefined") p = d * .3;
      if (!a || a < Math.abs(c)) {
        a = c;
        s = p / 4;
      } else {
        s = p/(2*Math.PI) * Math.asin(c/a);
      }
      return (a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b);
    },
    easeInOut: (t, b, c, d, a, p) => {
      var s;
      if (t==0) return b;
      if ((t /= d / 2) == 2) return b+c;
      if (typeof p == "undefined") p = d * (.3 * 1.5);
      if (!a || a < Math.abs(c)) {
        a = c;
        s = p / 4;
      } else {
        s = p / (2  *Math.PI) * Math.asin(c / a);
      }
      if (t < 1) return -.5 * (a * Math.pow(2, 10* (t -=1 )) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
      return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p ) * .5 + c + b;
    }
  },
  Back: {
    easeIn: (t, b, c, d, s) => {
      if (typeof s == "undefined") s = 1.70158;
      return c * (t /= d) * t * ((s + 1) * t - s) + b;
    },
    easeOut: (t, b, c, d, s) => {
      if (typeof s == "undefined") s = 1.70158;
      return c * ((t = t/d - 1) * t * ((s + 1) * t + s) + 1) + b;
    },
    easeInOut: (t, b, c, d, s) => {
      if (typeof s == "undefined") s = 1.70158;
      if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
      return c / 2*((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
    }
  },
  Bounce: {
    easeIn: (t, b, c, d) => {
      return c - hhAppTween.Bounce.easeOut(d-t, 0, c, d) + b;
    },
    easeOut: (t, b, c, d) => {
      if ((t /= d) < (1 / 2.75)) {
        return c * (7.5625 * t * t) + b;
      } else if (t < (2 / 2.75)) {
        return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
      } else if (t < (2.5 / 2.75)) {
        return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
      } else {
        return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
      }
    },
    easeInOut: (t, b, c, d) => {
      if (t < d / 2) {
        return hhAppTween.Bounce.easeIn(t * 2, 0, c, d) * .5 + b;
      } else {
        return hhAppTween.Bounce.easeOut(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
      }
    }
  }
}

Math.tween = hhAppTween;

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

const hhAppWebpage = {
  homePage: `
    <div class="covers"></div>
    <div class="search-panel">
      <input id="search-input" type="text" />
      <a class="search-btn">搜索漫画</a>
    </div>
    <div class="list-panel">
      <div class="list-slider-panel"></div>
    </div>
  `,
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
          width: ${hhAppConfig.imageWidth}px; height: ${hhAppConfig.imageHeight}px"
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
    // @TODO load custom config from localStorage
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
    // @TODO const ww = window.innerWidth;
    // @TODO const wh = window.innerHeight;

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
      // router = [pathname, ('comic'|'xiee'|sth unkown), comicid, pageid]
      const router = loc.pathname.match(hhAppConfig.reg_ComicPathname);
      if (router == null) {
        // redirect to homepage if location is not href to a certain comic
        hhApp.openUrl(hhAppConfig.baseUrl);
      } else {
        const comicid    = router[2];
        const pageid     = router[3];
        hhAppUI.showComic(comicid, pageid);
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
  // @TODO need to be redesigned for using more convinently
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
