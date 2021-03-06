/**
 * @file search-video MIP版
 * @author 邹红全<zouhongquan@baidu.com>
 * @version 1.0
 * @copyright 2018 Baidu.com, Inc. All Rights Reserved
 */
define(function (require) {
    var Webb2 = require('./webb2.min');
    var md5 = require('./md5.min');
    var util = require('util');
    var platform = util.platform;
    /*var platform = require('./platform');*/
    var videoLog =  {
    	status: {
        	init: false,
        	waiting: false
        },
        time: {
            play: 0,
            /*loadstart的时机(video提供的事件回调)*/
            loadstart: 0,
            /*loadmetadata的时机(video提供的事件回调)*/
            loadedmetadata: 0,
            /*loadeddata的时机(video提供的事件回调)*/
            loadeddata: 0,
            currentTime: 0
        },
        expand: {
            /*加载播放器到dns解析完的时长*/
            loadplayer_2_dns: 0,
            /*dns解析完到建连完毕的时长*/
            dns_2_connect: 0,
            /*建连完毕到loadstart的时长*/
            loadplayer_2_loadstart: 0,
            /*loadstart到loadmetadata的时长*/
            loadstart_2_loadmetadata: 0,
            /*loadmetadata到loadeddata的时长*/
            loadmetadata_2_loadeddata: 0,
            /*loadeddata到playing的时长*/
            loadeddata_2_playing: 0,
            /*点击到playing的时长*/
            loadplayer_2_playing: 0
        },
        network: 'unknown',
        getNetworkType: 'baiduboxapp://v19/utils/getNetworkType?callback=videoPageGetNetworkType',
        ua: platform,
        sectionNum: 10
    };

    var log = {
        init: function () {
            var lid = md5(location.href + (+new Date()) + Math.random());
            this.webb2 = new Webb2({
                pid: '1_5',
                lid: lid,
                /* eslint-disable fecs-camelcase */
                pf_comm: {
                    sample: 1
                },
                et_comm: {
                    sample: 1
                }
                /* eslint-enable fecs-camelcase */
            });
        },

        /**
         * Bind log event
         * @param {Element} videoEl <video> element
         */
        bind: function (videoEl) {
            var self = this;
            self.init();
	        /*self.getNetwork();*/
    	    window.videoPageGetNetworkType = function (data) {
    		    var data = JSON.parse(data);
    		    if (data && !parseInt(data.status, 10) && data.data) {
    			    videoLog.network = data.data.networkType;
    		    }
    	    };

            var autoplay = videoEl.getAttribute('autoplay');
            if (autoplay) {
                videoLog.time.play = +new Date();
            }
            var urlData = {
                url: location.href,
                videoSrc: videoEl.src
            };
            // Play times & Start time
            videoEl.addEventListener('play', function () {
                if (!videoLog.status.init) {
                    videoLog.time.play = +new Date();
                }
            });
	        videoEl.addEventListener('loadstart', function() {
        	   videoLog.time.loadstart = +new Date();
            });
            videoEl.addEventListener('loadedmetadata', function() {
        	   videoLog.time.loadedmetadata = +new Date();
            });
            videoEl.addEventListener('loadeddata', function() {
        	   videoLog.time.loadeddata = +new Date();
            });
            videoEl.addEventListener('playing', function () {
                var playingTime = +new Date();
                // iOS playing event is true playing
                if (!videoLog.status.init && platform.isIos()) {
		            self.getPlayTime(urlData);
                }
            });
            var sectionArr = new Array(videoLog.sectionNum);
            videoEl.addEventListener('timeupdate', function () {
                // Hack Android playing event
                if (!videoLog.status.init && platform.isAndroid() && videoEl.currentTime !== 0) {
		            self.getPlayTime(urlData);
                }
                // If duration > 10s send Played time & Play completion ratio log
                if (videoEl.duration > 10) {
                    for (var i = 0; i < sectionArr.length; i++) {
                        if (typeof sectionArr[i] === 'undefined'
                        && ((videoEl.currentTime / videoEl.duration) >= (i / sectionArr.length))) {
                            sectionArr[i] = 1;
                            // Data of 0% is replace by play times
                            if (i !== 0) {
                                var data = {
                                    currentTime: videoEl.currentTime,
                                    cent: (i / videoLog.sectionNum) * 100 + '%'
                                };
                                Object.assign(data, urlData);
                                self.sendLog('section', data);
                            }
                        }
                    }
                }
            });
            // Play end statistics separately
            videoEl.addEventListener('ended', function () {
                var data = {
                    currentTime: videoEl.currentTime,
                    cent: '100%'
                };
                self.sendLog('section', data);
            });
            // Error log
            videoEl.addEventListener('error', function () {
                var data = videoEl.error;
                send('error', data);
            });
        },
	getNetwork() {
		var self = this;
		var ua = videoLog.ua;
		var isSearchCraft = /SearchCraft/i.test(navigator.userAgent); 
		if (isSearchCraft) {
			self.getNetworkSearchCraft();
		} else if (ua.isBaiduApp()) {
			self.getNetworkBaidubox();
		}
    	},
        // 简单搜索版本号
        secrVersion: function () {
	    var ua = navigator.userAgent;
            var match = ua.match(/ SearchCraft\/([0-9]+_)?([0-9.]+)/i);
            var version = /(iPhone|iPod|iPad)/.test(ua) ? match[2].split('.') : match[2].split('.');
            return version ? version.map(parseFloat) : [];
        },
	/**
	 * 将当前简单版本跟目标版本的版本号进行对比
	 *
	 * @param {String} version 目标版本
	 * @return {Booleans} true/false true表示当前版本>=目标版本，false表示当前版本<目标版本
	 */
	versionCompare(version) {
		var curVer = 0;
		var destVer = 0;
		var secrVersion = this.secrVersion();
		var destVersion = version.split('.');
		for (var i = 0, l = secrVersion.length; i < l; i++) {
			curVer += secrVersion[i];
		}
		for (var j = 0, m = destVersion.length; j < m; j++) {
			destVer += (destVersion[j] - 0);
		}
		if (curVer < destVer) {
			return false;
		} else {
			return true;
		}
	},
	/*获取手百的网络状态*/
	getNetworkBaidubox() {
		location.assign(videoLog.getNetworkType);
	},
	/*获取简单的网络状态*/
	getNetworkSearchCraft() {
		var self = this;
		var ua = videoLog.ua;
		if (!ua.isSearchCraft() || ua.isSearchCraft() && !self.versionCompare('2.9')) return;
		var msg = {
			func: "invokeModule",
      			moduleName: "Utility",
      			options :{
				action: "network"   // 获取网络状态
      			},
			callback: "searchcraftWifiCb"
		}
		if (window.Viaduct && window.Viaduct.postMessage) {
			ua.isAndroid() ? window.Viaduct.postMessage(JSON.stringify(msg)) : window.Viaduct.postMessage(msg);
		}
		window.searchcraftWifiCb = function(param) {
			if (param.status == 0 && param.data && param.data.network) {
				videoLog.network = param.data.network;
			}
		}
	},
	//获取dns解析和建连时间
	getDnsConnect() {
		/*查下performance api浏览器是否支持*/
		if (typeof window.performance == 'undefined' || typeof window.performance.getEntriesByType == 'undefined') {
			videoLog.expand.loadplayer_2_dns = -1;
			videoLog.expand.dns_2_connect = -1;
			return;
		}
		var resources = window.performance.getEntriesByType('resource');
		for(var i = 0, l = resources.length; i < l; i++) {
			if (resources[i].name.match(/^https:\/\/vdse.bdstatic.com/) ||
					resources[i].name.match(/^https:\/\/vd1.bdstatic.com/) ||
					resources[i].name.match(/^https:\/\/vd2.bdstatic.com/) ||
					resources[i].name.match(/^https:\/\/vd3.bdstatic.com/) ||
					resources[i].name.match(/^https:\/\/vd4.bdstatic.com/)) {
				videoLog.expand.loadplayer_2_dns = resources[i]['domainLookupEnd'] - resources[i]['domainLookupStart'];
				videoLog.expand.dns_2_connect = resources[i]['connectEnd'] - resources[i]['connectStart'];
				break;
			}
		}
	},
	/**
	 * 获取播放过程中的各种时长
	 * @param {Number} time 视频播放时机
	 */
	getPlayExpand(time) {
		videoLog.expand.connect_2_loadstart = videoLog.time.loadstart - (videoLog.time.play + videoLog.expand.loadplayer_2_dns + videoLog.expand.dns_2_connect);
		//to check loadstart和play的时机谁先谁后
		videoLog.expand.loadplayer_2_loadstart = videoLog.time.loadstart - videoLog.time.play;
		videoLog.expand.loadstart_2_loadmetadata = videoLog.time.loadedmetadata-videoLog.time.loadstart;
		videoLog.expand.loadmetadata_2_loadeddata = videoLog.time.loadeddata-videoLog.time.loadedmetadata;
		videoLog.expand.loadeddata_2_playing = time - videoLog.time.loadeddata;
		videoLog.expand.loadplayer_2_playing = time - videoLog.time.play;
	},
	createLogDebug() {
		var str = '' +
			'loadplayer_2_dns:' + videoLog.expand.loadplayer_2_dns + '<br/>' +
			'dns_2_connect: ' + videoLog.expand.dns_2_connect + '<br/>' +
			'connect_2_loadstart: ' + videoLog.expand.connect_2_loadstart + '<br/>' +
			'loadplayer_2_loadstart: ' + videoLog.expand.loadplayer_2_loadstart + '<br/>' +
			'loadstart_2_loadmetadata: ' + videoLog.expand.loadstart_2_loadmetadata + '<br/>' +
			'loadmetadata_2_loadeddata: ' + videoLog.expand.loadmetadata_2_loadeddata + '<br/>' +
			'loadeddata_2_playing: ' + videoLog.expand.loadeddata_2_playing + '<br/>' +
			'loadplayer_2_playing: ' + videoLog.expand.loadplayer_2_playing + '<br/>';
		if (!document.querySelector('#videoLogDebug')) {
			var ele = document.createElement('div'); 
			ele.style.cssText = 'position:fixed;z-index:1001; top:0;left:0;background-color:green;z-index:1000;text-align:left;overflow:scroll;';
			ele.id = 'videoLogDebug'; 
			ele.innerHTML = str;
			document.body.appendChild(ele);
		} else {
			document.querySelector('#videoLogDebug').innerHTML = str;
		}
	},
	getPlayTime(data) {
		var self = this;
		videoLog.status.init = true;
		self.getDnsConnect();
		var playTime = videoLog.time.play;
		/*短视频落地页页面加载的时候就试图自动播放视频，会调用video的loadstart*/
		if (videoLog.time.loadstart < playTime) {
			videoLog.time.loadstart = playTime;
			videoLog.time.play = videoLog.time.loadstart - (videoLog.expand.loadplayer_2_dns + videoLog.expand.dns_2_connect);
		}
		if (videoLog.time.loadedmetadata < playTime) {
			videoLog.time.loadedmetadata = videoLog.time.loadstart;
		}
		if (videoLog.time.loadeddata < playTime && videoLog.time.loadeddata > 0) {
			videoLog.time.loadeddata = videoLog.time.loadedmetadata;
		}

		/*有一些浏览器不支持loadeddata，或者loadeddata执行的时机晚于playing*/
		if (videoLog.time.loadeddata === 0) {
			videoLog.time.loadeddata = +new Date();
		}
		var time = +new Date();
		self.getPlayExpand(time);
		self.createLogDebug();
		self.sendLog('play', data);
	},
        /**
         * Send log function
         * @param {string} type event type
         * @param {Object} data the record data object
         */
        sendLog: function (type, data) {
            var self = this;
            var time = '';
            switch (type) {
                case 'play':
		            var expand = videoLog.expand;
        		    // Send log when first time start play
        		    self.webb2.sendPfLog(
                    //info
				    {
                        loadplayer_2_dns: expand.loadplayer_2_dns,
                        dns_2_connect: expand.dns_2_connect,
                        connect_2_loadstart: expand.connect_2_loadstart,
                        loadplayer_2_loadstart: expand.loadplayer_2_loadstart,
                        loadstart_2_loadmetadata: expand.loadstart_2_loadmetadata,
                        loadmetadata_2_loadeddata: expand.loadmetadata_2_loadeddata,
                        loadeddata_playing: expand.loadeddata_playing,
                        loadplayer_2_playing: expand.loadplayer_2_playing
                    },
                    //dim
                    {
                        net: videoLog.network,
                        type: 'thirdparty'
                    },
                    //ext
                    {
                        ext: {
                            videoSrc: data.videoSrc
                         }
                    });
                    break;
                case 'section':
                    self.webb2.sendPfLog(
                        //info
                        {
                            cent: data.cent
                        },
                        //dim
                        {
                            net: videoLog.network,
                            type: 'thirdparty-cent'
                        },
                        //ext
                        {
                            ext: {
                                videoSrc: data.videoSrc
                             }
                        });
                    break;
                case 'error':
                    self.webb2.sendExceptionLog(
                        // info
                        {
                            code: data.code,
                            message: data.message
                        },
                        // dim
                        {
                            net: self.videoLog.network
                        },
                        // ext
                        {
                            ext: {
                                refer: data.refer,
                                videoSrc: data.videoSrc
                            }
                        }
                    );
                    break;
            }
        }
    };
    return log;
});
