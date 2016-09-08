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
