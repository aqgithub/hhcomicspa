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
