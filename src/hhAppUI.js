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
