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
    // if (hhApp.comicCache.hasOwnProperty(comicid) && hhApp.comicCache[comicid].hasOwnProperty('comicVolumnInfo') && !forceRefetch) {
    //   return hhApp.comicCache[comicid];
    // }
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
        serverUrl: hhApp.serverUrls[serverJsIndex][serverid],
        picListSalt: hhApp.picListSalts[serverJsIndex],
      });
    }
    return hhAppParser.GM_xhr_get(hhAppConfig.serverJsUrl(serverJsIndex)).then(
      _serverJsHTML => {
        const serverJsHTML  = _serverJsHTML.responseText;
        const picListSalt  = serverJsHTML.match(hhAppConfig.reg_ServerEncode)[1];
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
          serverUrl: serverUrls[serverid],
          picListSalt,
        };
      },
      () => {}
    );
  },
  fetchImage() {

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
