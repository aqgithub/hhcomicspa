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
