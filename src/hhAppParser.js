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
