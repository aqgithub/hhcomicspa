const hhAppUI = {

  // distance the slider will move
  coverSliderMoveDistance:       0,
  //
  coverSliderMoveStart:          0,
  //
  coverSliderMarginLeft:         0,

  //
  coverSilderCanMove:            true,

  //
  coverSliderAnimationTime:      0,
  //
  coverSliderAnimationDuration:  60,
  //
  listShowNumber:                0,
  // distance the slider moves on mousewheel
  coverSliderStep:               220,


  showErrPage(showWholePage = true) {
    // Oops, app cannot recongnize this page
    if (showWholePage) {
      $('<span>Oops, app cannot recongnize this page!!!</span>').appendTo('body');
    }
  },
  showHomePage() {
    $(hhAppWebpage.homePage).appendTo('body');
    hhAppUI.bindListener();
    hhAppUI.showComicList(true);
    hhAppUI.coverListSliderMove();
  },
  bindListener() {

  },
  showComicList(forceShowList = false) {
    const listShow = hhApp.comicList[hhApp.listShowIndex];
    hhAppUI.listShowNumber = listShow.length;
    const $listPanel = $('.list-panel');
    const $listLoading = $('.list-loading');
    // infomation of list to be shown has not been loaded yet
    if (listShow.length == 0) {
      $listPanel.html(hhAppWebpage.listLoading);
      return false;
    }
    if (forceShowList || $listLoading.length > 0) {
      $listPanel.html(hhAppWebpage.listSliderPanel);

      // if not enough covers in listShow
      let coverNumberTotal = hhApp.coverNumMaxInList;
      hhAppUI.coverSilderCanMove = true;
      if (listShow.length <= hhApp.coverNumMaxInList - 1) {
        coverNumberTotal = listShow.length;
        hhAppUI.coverSilderCanMove = false;
      }
      // push all cover elements of the slider into a string
      let coversHTML = '';
      for (let i = 0; i < coverNumberTotal; i++) {
        const coverInfo = listShow[i + hhApp.coverFirstIndex];
        coversHTML += hhAppWebpage.coverInList(
          coverInfo.coverImageUrl,
          coverInfo.comicTitle,
          coverInfo.comicUrl
        );
      }

      $('.list-slider')
        .html(coversHTML)
        .css({
          marginLeft: hhAppUI.coverSliderMarginLeft
        }
      );

      $('.list-slider').on('mousewheel', e => hhAppUI.coverSliderMouseWheelHandler(e.deltaY));

      $(`.cover-panel`).on('click', e => {
        hhApp.openUrl($(e.currentTarget).attr('data-url'));
      });
    }
  },
  coverSliderMouseWheelHandler(direction) {
    if (!hhAppUI.coverSilderCanMove) {
      return false;
    }
    hhAppUI.coverSliderAnimationTime = 0;
    hhAppUI.coverSliderMoveDistance = direction * hhAppUI.coverSliderStep;
    hhAppUI.coverSliderMoveStart = Math.floor($('.list-slider').css('marginLeft').replace(/px/, ''));
  },
  coverListSliderMove() {
    const $listSlider = $(`.list-slider`);
    if ($listSlider.length > 0) {
      if (hhAppUI.coverSliderMoveDistance != 0 && hhAppUI.coverSliderAnimationTime < hhAppUI.coverSliderAnimationDuration) {
        hhAppUI.coverSliderAnimationTime++;
        const coverSliderMoveTo = Math.tween.Quart.easeOut(
          hhAppUI.coverSliderAnimationTime,
          hhAppUI.coverSliderMoveStart,
          hhAppUI.coverSliderMoveDistance,
          hhAppUI.coverSliderAnimationDuration
        );
        if (coverSliderMoveTo > 0) {
          if (hhApp.coverFirstIndex == 0) {
            hhAppUI.coverSliderAnimationTime = 0;
            hhAppUI.coverSliderMoveDistance = 0;
            $listSlider.css('marginLeft', 0);
            requestAnimationFrame(hhAppUI.coverListSliderMove);
            return false;
          }
          hhApp.coverFirstIndex--;
          hhAppUI.showComicList(true);
          $listSlider.css('marginLeft', '-=200px');
          hhAppUI.coverSliderMoveStart -=200;
          requestAnimationFrame(hhAppUI.coverListSliderMove);
          return false;
        }

        const coverSliderMinMarginLeft = Math.floor(hhApp.coverSliderWidth - 200 * hhApp.coverNumMaxInList);
        if (Math.floor(coverSliderMoveTo) < coverSliderMinMarginLeft){
          if (hhApp.coverFirstIndex + hhApp.coverNumMaxInList == hhAppUI.listShowNumber) {
            hhAppUI.coverSliderAnimationTime = 0;
            hhAppUI.coverSliderMoveDistance = 0;
            $listSlider.css('marginLeft', hhApp.coverSliderWidth - 200 * hhApp.coverNumMaxInList);
            requestAnimationFrame(hhAppUI.coverListSliderMove);
            return false;
          }
          hhApp.coverFirstIndex++;
          hhAppUI.showComicList(true);
          $listSlider.css('marginLeft', '+=200px');
          hhAppUI.coverSliderMoveStart += 200;
          requestAnimationFrame(hhAppUI.coverListSliderMove);
          return false;
        }
        $listSlider.css({ marginLeft: coverSliderMoveTo });
      }
    }
    requestAnimationFrame(hhAppUI.coverListSliderMove);
  },
};
