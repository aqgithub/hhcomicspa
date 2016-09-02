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
