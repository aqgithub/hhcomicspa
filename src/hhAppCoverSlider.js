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
