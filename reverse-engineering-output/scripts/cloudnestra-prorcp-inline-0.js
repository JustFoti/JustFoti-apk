var ds_langs = [];
        var ds_lang = false;
        var sub_shown_lang = "";
        
        
        
        
        var flnm = removeExtension(atob('QmV0dGVyLkNhbGwuU2F1bC5TMDZFMDIuMTA4MHAuV0VCLkgyNjQtR0xIRi9iZXR0ZXIuY2FsbC5zYXVsLnMwNmUwMi4xMDgwcC53ZWIuaDI2NC1nbGhmLm1rdg=='));
        
        
        flnm = flnm.split("/");
        var flnm_data = [];
        for (const key in flnm) {
            flnm_data.push(tprs.parse(flnm[key]));
        }
        
        var pljs_sub_lang = localStorage.getItem("pljssubtitle");
        if(typeof pljs_sub_lang === 'string' || pljs_sub_lang instanceof String){
            for (let lang of sub_langs) {
                var tmp_lang_regexp = new RegExp(lang.LanguageName, "i");
                if(tmp_lang_regexp.test(pljs_sub_lang)){
                    ds_lang = lang;
                    break;
                }
            }
        }
    
    
        
    
                ds_lang = get_lang_from_iso639(JSON.parse('[]')[0]);
                
                
        
        var pass_path = "//tmstr1.cloudnestra.com/rt_ping.php";
        
        var ping_interval = false;
        
        
        var subs_shown = false;
        var the_subtitles = [];
        
        var default_subtitles = "";
          
          
                    default_subtitles = "[English [SDH]]/subs/d4c3c26ccf0d3eea7ad4bf65c821ec69/English+%5BSDH%5D.eng.vtt,[English]/subs/d4c3c26ccf0d3eea7ad4bf65c821ec69/English.eng.vtt";
                    
        
        
        
                var db_subs = [];
                
        
        var lc_on = IsLcOn();
        
        var current_sub_name = "cs_"+$("body").data("i");
        
        if($("body").data("s") && $("body").data("e")){
            current_sub_name += "_"+$("body").data("s")+"x"+$("body").data("e");
        }
        
        if(default_subtitles.length > 0){
            the_subtitles = default_subtitles.split(",");
            //player.api("subtitle",default_subtitles);
        }
        
        
        //var player = new Playerjs({id:"player_parent", cuid:"cc72611b6ac84841aeafdfa2f33ed352",file:"", poster:"//image.tmdb.org/t/p/w780/hPea3Qy5Gd6z4kJLUruBbwAH8Rm.jpg" , ready:"PlayerReady" , autoplay:1 , subtitle: default_subtitles});
                
                var player = new Playerjs({id:"player_parent", file: eSfH1IRMyL , cuid:"cc72611b6ac84841aeafdfa2f33ed352",poster:"//image.tmdb.org/t/p/w780/hPea3Qy5Gd6z4kJLUruBbwAH8Rm.jpg" , ready:"PlayerReady" , autoplay:1 , subtitle: default_subtitles , "default_quality":"max"});    
                
        
        if(player.api("subtitles").length > 1 && ds_lang){
            setStartSubtitle();
        }else if(player.api("subtitles").length === 1){
            player.api("subtitle" , player.api("subtitles").length-1);
        }
        
                
        
        
        if(lc_on){
            current_sub = localStorage.getItem(current_sub_name);
            if(typeof current_sub === 'string' && isJson(current_sub)){
                current_sub = JSON.parse(current_sub);
                if(current_sub.lang_short != sub_shown_lang){
                    addSubtitle(current_sub);
                }
            }
        }
        
        var video = $("#player_parent").find("video")[0];
    
    
        
                var watched = {
            value: 0,
            report: 0,
            interval: false ,
            duration: 0,
            set: function (value) {
                this.value = value;
                this.onChange();
            },
            onChange: function(){
                //console.log(this.value);
                //console.log(this.duration);
                if(this.duration > 0){
                    if(this.report < 5){
                        var limit = this.duration*0.05;
                        if(limit < 30){
                            limit = 30
                        }
                        if(this.value > limit){
                            this.report = 5;
                            $.get("/fsdD/NmMwYTI2YTk1ODg2NGUxNzNlYmU4Zjg5ZTk0ZTY2NDA6YUVKTloyTXdXV2cyYVhBNGVGVmlXVEZPU2pWTGJtNVZOWFV4WWtWSmIyeExNMDByUVVkVVZXcFRhRUY1VFRSdmRpdFhSMW8wTDFGbmVqUnhUM05JYTFaT1ZraFNZMVlyTUVoTlZETmhORVkwZWpsSlJHRXJhV3htVFhsaU9GVnZVbXhoVHpKRlNrZDZVRzlSUjNnNFdubEhkakZVUlZWbFNrRnRZM2h5TDFOakt6aHpaM0I0ZURVME9YZEZhek5yWm1aeWJFSldiVW8wUXpoM1dYcEZkazlFTTJ0bGQyZGhRVTVZY2taS1ZHNUdXRnBwT0ZKTWNtaFphRUZZTVhGTk0yMWxUSGxhUm1WSWNYZFhNRmx4T0ZSbmFFYzFZek01YVRsNVJGSTNTa3RZTUhGMVFuVTJla0ZLUWpGQ0swbENMMDV1VHl0d2FFeERNbVl2V2s1NmRIZ3paMEZZVGpabWRFczRhRWhQUmpsWU1sSTFhMVJST1VoaVEzZ3pORWRaWVRkWllXUXlaM0p3ZUZSa1pGTTJhbTV6YURsT2NYcExlak4yVEhsVFJHWjNkVGhyTDIxWmQwNWlRV3A2Y1d4aFNtTnVTa296YjFoM1MxcHBVMWR3UjI4MGNUTTNibXRYVlc0MVYwa3ZaSGMxSzAxdVQzRjVWM2RwU2pSdmNHczVSWE56TjJzMWMxa3hSbmxwTTJWUVVGZERUMlV3TWtSNVNqTkpVRU5EZDJ3NFFqbHZZV2RJTXpsblFrNXNkVzFSVEZWeU5FOWhXWEpHTmlzdmFWZG9ZMlZhVWsxVmEwVXhWbU5PZWtOdWNtRk5jRlZVWTJkR2RXZGhjMlpQTUVKT1puVmhOVVp0VjNwU1RFRXpTM2hoZFRoMWJTdENUbm9yYlVwTWJ6VnhUSHA2ZVd4RmIxQlFSVGw0UjBjeUwzcFNTWFJzWnpka2ExUjVVemxoTTFRNFkxUTNjbVYxVERGbFkzWm5NaTlSVmtKMk5URm9hWE5FV2tJclJucE1jMFJVS3poMmJsUmlUQ3RsZFVFclpFOXZhR3B0VjIxNk1FOVdhR0pNUWtWSFNsTjJNVFZPTDNCT1dFcFJNbUpSVTJJeU5rdENTVFZXVTJ4bVpVVlVkVXRLYUd0b2JGZDNWVGhVWkRVME9YcG1NMmt2YW1WT1pHcFNabEZaUzA5alZubGlMMkpqUVRsbGVFUTFLemcyUWxwR2NEUkpRekJLSzFkNlFXNDVOVmxaUkZkdldqRjBZVUl4TTBKVFkxRjRlV3RoTlhwMWQwWmhNM2MwVVcxb1MxUjRaMVI2WTBwUmMybFFkU3RqZURGSU5HZHlTSEZCVW10U1Z6TjJSV3RXZGxKMmNYQnZiR3RYYm1ObGRrMUJWRFpFYzFCelZWcDZaalpWZUZkMWRURklUM0pwZVRKcVdWQnVORVJWU0c5dFIyOWpVVEZaWmtjeU5FUnpaa1YwWTFveVpXZ3lkWElyZVRCTldHOXFXVUpLTmpGWVEyTnRjRFJEY2tsNFF5dEJZVXd2WkVnclQwbEhOSE14YTNGcmRHcFJibVpTVEVwRFVuRjVTRkpYZVVOSkwxYzRSVkJPTWtJelMyZHJXRTl2V20weVVIVk9VRzRyUkdST01HWnBiWFZ6UlVFMWRUVmlVSFp3VURFck0zRXJSa281VG1ONVFWTjFaVmd6UldwME9GSkhXbVozVm1kVWVrZHpjQ3R5ZUcxV1VWUTFRVkUwTkVaSGEzSjBRWGQxVmxsVlUyMTNRVFpSY21adVUwaHpjWGxNTWpSUGVsRkdabk5yWlZsdVEwWm5RbEptVEVodVlWUTBUVFZIVDNSaWJXZEtUV2xOUms1WFYxaFZWemxuYkVOUmJqbFJhMnh0T1VSUE5YWlBUQ3RYWlZoSWRHaFdibFJ4TDFRelZrbFdlazFDUzJwVFR6TkxSRVZMYlc1cFV6VkRjRGhKYVhOSE9HMXVjM2hIZDA4emRrODVVbmRJU1RFMlJ6QXZaWEF2Y1dkRVRGVnBOVXNyU1VOemFVdzNhVUozUW1OSWNsRlVXbGxNY1dOeFdEQm9URlpKT1ZWSU4zWnhkakJaUVhkV1lsSTNXbXhySzFKeVFVWkVTMHRhUjJzMmMxUlFhMDluWjJ3emVFcGFVbFZwVEd0TmVHdFhSVmt5UjBacVJGQTNRekFyVURaRVRreEpVVmxDYUVVM1pHZEdSSE13UzFKQ1UxQldaVkJTVW5sek5qVldiM1psT0cxa09IbDNiME5HZFRVMFFsYzRSa2hOUkhsRFQxSnBOWEJvWWtOYVQzVk1aa3hLVjB4M2NUa3ZUakZtVFdoWU9YQkpNR2xEWkhkTVZWTmphRXRWZVRaemFXVjRXamRFVG05blkzaG9Wa2xOTWxOU2EzaHZORlo2VkhWWGRYSjZSRGxoT0Zob2NWbDRNak4zUVd3MlRYSjBZMDFoVFQwPQ--");
                        }
                        /*
                        if(this.value > (this.duration*0.05)){
                            this.report = 5;
                            $.get("/vsdV/NmMwYTI2YTk1ODg2NGUxNzNlYmU4Zjg5ZTk0ZTY2NDA6YUVKTloyTXdXV2cyYVhBNGVGVmlXVEZPU2pWTGJtNVZOWFV4WWtWSmIyeExNMDByUVVkVVZXcFRhRUY1VFRSdmRpdFhSMW8wTDFGbmVqUnhUM05JYTFaT1ZraFNZMVlyTUVoTlZETmhORVkwZWpsSlJHRXJhV3htVFhsaU9GVnZVbXhoVHpKRlNrZDZVRzlSUjNnNFdubEhkakZVUlZWbFNrRnRZM2h5TDFOakt6aHpaM0I0ZURVME9YZEZhek5yWm1aeWJFSldiVW8wUXpoM1dYcEZkazlFTTJ0bGQyZGhRVTVZY2taS1ZHNUdXRnBwT0ZKTWNtaFphRUZZTVhGTk0yMWxUSGxhUm1WSWNYZFhNRmx4T0ZSbmFFYzFZek01YVRsNVJGSTNTa3RZTUhGMVFuVTJla0ZLUWpGQ0swbENMMDV1VHl0d2FFeERNbVl2V2s1NmRIZ3paMEZZVGpabWRFczRhRWhQUmpsWU1sSTFhMVJST1VoaVEzZ3pORWRaWVRkWllXUXlaM0p3ZUZSa1pGTTJhbTV6YURsT2NYcExlak4yVEhsVFJHWjNkVGhyTDIxWmQwNWlRV3A2Y1d4aFNtTnVTa296YjFoM1MxcHBVMWR3UjI4MGNUTTNibXRYVlc0MVYwa3ZaSGMxSzAxdVQzRjVWM2RwU2pSdmNHczVSWE56TjJzMWMxa3hSbmxwTTJWUVVGZERUMlV3TWtSNVNqTkpVRU5EZDJ3NFFqbHZZV2RJTXpsblFrNXNkVzFSVEZWeU5FOWhXWEpHTmlzdmFWZG9ZMlZhVWsxVmEwVXhWbU5PZWtOdWNtRk5jRlZVWTJkR2RXZGhjMlpQTUVKT1puVmhOVVp0VjNwU1RFRXpTM2hoZFRoMWJTdENUbm9yYlVwTWJ6VnhUSHA2ZVd4RmIxQlFSVGw0UjBjeUwzcFNTWFJzWnpka2ExUjVVemxoTTFRNFkxUTNjbVYxVERGbFkzWm5NaTlSVmtKMk5URm9hWE5FV2tJclJucE1jMFJVS3poMmJsUmlUQ3RsZFVFclpFOXZhR3B0VjIxNk1FOVdhR0pNUWtWSFNsTjJNVFZPTDNCT1dFcFJNbUpSVTJJeU5rdENTVFZXVTJ4bVpVVlVkVXRLYUd0b2JGZDNWVGhVWkRVME9YcG1NMmt2YW1WT1pHcFNabEZaUzA5alZubGlMMkpqUVRsbGVFUTFLemcyUWxwR2NEUkpRekJLSzFkNlFXNDVOVmxaUkZkdldqRjBZVUl4TTBKVFkxRjRlV3RoTlhwMWQwWmhNM2MwVVcxb1MxUjRaMVI2WTBwUmMybFFkU3RqZURGSU5HZHlTSEZCVW10U1Z6TjJSV3RXZGxKMmNYQnZiR3RYYm1ObGRrMUJWRFpFYzFCelZWcDZaalpWZUZkMWRURklUM0pwZVRKcVdWQnVORVJWU0c5dFIyOWpVVEZaWmtjeU5FUnpaa1YwWTFveVpXZ3lkWElyZVRCTldHOXFXVUpLTmpGWVEyTnRjRFJEY2tsNFF5dEJZVXd2WkVnclQwbEhOSE14YTNGcmRHcFJibVpTVEVwRFVuRjVTRkpYZVVOSkwxYzRSVkJPTWtJelMyZHJXRTl2V20weVVIVk9VRzRyUkdST01HWnBiWFZ6UlVFMWRUVmlVSFp3VURFck0zRXJSa281VG1ONVFWTjFaVmd6UldwME9GSkhXbVozVm1kVWVrZHpjQ3R5ZUcxV1VWUTFRVkUwTkVaSGEzSjBRWGQxVmxsVlUyMTNRVFpSY21adVUwaHpjWGxNTWpSUGVsRkdabk5yWlZsdVEwWm5RbEptVEVodVlWUTBUVFZIVDNSaWJXZEtUV2xOUms1WFYxaFZWemxuYkVOUmJqbFJhMnh0T1VSUE5YWlBUQ3RYWlZoSWRHaFdibFJ4TDFRelZrbFdlazFDUzJwVFR6TkxSRVZMYlc1cFV6VkRjRGhKYVhOSE9HMXVjM2hIZDA4emRrODVVbmRJU1RFMlJ6QXZaWEF2Y1dkRVRGVnBOVXNyU1VOemFVdzNhVUozUW1OSWNsRlVXbGxNY1dOeFdEQm9URlpKT1ZWSU4zWnhkakJaUVhkV1lsSTNXbXhySzFKeVFVWkVTMHRhUjJzMmMxUlFhMDluWjJ3emVFcGFVbFZwVEd0TmVHdFhSVmt5UjBacVJGQTNRekFyVURaRVRreEpVVmxDYUVVM1pHZEdSSE13UzFKQ1UxQldaVkJTVW5sek5qVldiM1psT0cxa09IbDNiME5HZFRVMFFsYzRSa2hOUkhsRFQxSnBOWEJvWWtOYVQzVk1aa3hLVjB4M2NUa3ZUakZtVFdoWU9YQkpNR2xEWkhkTVZWTmphRXRWZVRaemFXVjRXamRFVG05blkzaG9Wa2xOTWxOU2EzaHZORlo2VkhWWGRYSjZSRGxoT0Zob2NWbDRNak4zUVd3MlRYSjBZMDFoVFQwPQ--");
                        }
                        */
                    }
                    
                }
            },
            setDur: function(dur){
                this.duration = dur;
            }
        }
                
        function PlayerReady(){
            gen_subs_el();
            gen_reporting_el();
        }
    
    
            
        var pm_player_data = {type:"PLAYER_EVENT"};
        var pm_time_last_update = 0;
        var pm_time_last_update_use = false;
        
        pm_player_data.data = {
            imdbId: "tt3032476",
            tmdbId: 60059,
            type: "tv",
            season: 6,
            episode: 2,
            currentTime: 0,
            duration: 0
        };
    
        function PlayerjsEvents(event,id,data){
            
            
            if(event=="play"){
                if(!ping_interval)
                    restart_ping_interval();
                
                pm_player_data.data.event = "play";
                window.parent.postMessage(pm_player_data , '*');
                //console.log(pm_player_data);
                
                if(!watched.interval){
                    watched.interval = setInterval(function(){
                        if(player.api("playing")){
                            watched.set(watched.value+1);
                            if(watched.value % 60 == 0){
                                //$.get("/watched");
                            }
                        }
                    },1000);
                }
            }
            
            if(event == "pause"){
                clearInterval(ping_interval);
                ping_interval = false;
                pm_player_data.data.event = "pause";
                window.parent.postMessage(pm_player_data , '*');
                //console.log(pm_player_data);
            }
            
            if(event == "time"){
                if((Date.now() - pm_time_last_update) > 5000){
                    pm_time_last_update = Date.now();
                    pm_player_data.data.event = "timeupdate";
                    pm_player_data.data.currentTime = parseInt(player.api("time"));
                    window.parent.postMessage(pm_player_data , '*');
                }
            }
            
            if(event == "end"){
                clearInterval(ping_interval);
                ping_interval = false;
                pm_player_data.data.event = "ended";
                pm_player_data.data.currentTime = parseInt(player.api("duration"));
                window.parent.postMessage(pm_player_data , '*');
                player.api("pause");
                //console.log(pm_player_data);
                
                            }
            
            if(event == "seek"){
                pm_player_data.data.event = "seeked";
                pm_player_data.data.currentTime = parseInt(player.api("time"));
                window.parent.postMessage(pm_player_data , '*');
                //console.log(pm_player_data);
            }
            
            
            if(event=="networkErrorHls"){
                data_parsed = JSON.parse(data);
                if(data_parsed.details == "fragLoadError" && data_parsed.fatal && watched.value < 60){
                    // checkAndLogUrlStatus();
                    // logToServerAndRedirect(pm_player_data);
                    // window.location.replace("https://cloudnestra.comNmMwYTI2YTk1ODg2NGUxNzNlYmU4Zjg5ZTk0ZTY2NDA6YUVKTloyTXdXV2cyYVhBNGVGVmlXVEZPU2pWTGJtNVZOWFV4WWtWSmIyeExNMDByUVVkVVZXcFRhRUY1VFRSdmRpdFhSMW8wTDFGbmVqUnhUM05JYTFaT1ZraFNZMVlyTUVoTlZETmhORVkwZWpsSlJHRXJhV3htVFhsaU9GVnZVbXhoVHpKRlNrZDZVRzlSUjNnNFdubEhkakZVUlZWbFNrRnRZM2h5TDFOakt6aHpaM0I0ZURVME9YZEZhek5yWm1aeWJFSldiVW8wUXpoM1dYcEZkazlFTTJ0bGQyZGhRVTVZY2taS1ZHNUdXRnBwT0ZKTWNtaFphRUZZTVhGTk0yMWxUSGxhUm1WSWNYZFhNRmx4T0ZSbmFFYzFZek01YVRsNVJGSTNTa3RZTUhGMVFuVTJla0ZLUWpGQ0swbENMMDV1VHl0d2FFeERNbVl2V2s1NmRIZ3paMEZZVGpabWRFczRhRWhQUmpsWU1sSTFhMVJST1VoaVEzZ3pORWRaWVRkWllXUXlaM0p3ZUZSa1pGTTJhbTV6YURsT2NYcExlak4yVEhsVFJHWjNkVGhyTDIxWmQwNWlRV3A2Y1d4aFNtTnVTa296YjFoM1MxcHBVMWR3UjI4MGNUTTNibXRYVlc0MVYwa3ZaSGMxSzAxdVQzRjVWM2RwU2pSdmNHczVSWE56TjJzMWMxa3hSbmxwTTJWUVVGZERUMlV3TWtSNVNqTkpVRU5EZDJ3NFFqbHZZV2RJTXpsblFrNXNkVzFSVEZWeU5FOWhXWEpHTmlzdmFWZG9ZMlZhVWsxVmEwVXhWbU5PZWtOdWNtRk5jRlZVWTJkR2RXZGhjMlpQTUVKT1puVmhOVVp0VjNwU1RFRXpTM2hoZFRoMWJTdENUbm9yYlVwTWJ6VnhUSHA2ZVd4RmIxQlFSVGw0UjBjeUwzcFNTWFJzWnpka2ExUjVVemxoTTFRNFkxUTNjbVYxVERGbFkzWm5NaTlSVmtKMk5URm9hWE5FV2tJclJucE1jMFJVS3poMmJsUmlUQ3RsZFVFclpFOXZhR3B0VjIxNk1FOVdhR0pNUWtWSFNsTjJNVFZPTDNCT1dFcFJNbUpSVTJJeU5rdENTVFZXVTJ4bVpVVlVkVXRLYUd0b2JGZDNWVGhVWkRVME9YcG1NMmt2YW1WT1pHcFNabEZaUzA5alZubGlMMkpqUVRsbGVFUTFLemcyUWxwR2NEUkpRekJLSzFkNlFXNDVOVmxaUkZkdldqRjBZVUl4TTBKVFkxRjRlV3RoTlhwMWQwWmhNM2MwVVcxb1MxUjRaMVI2WTBwUmMybFFkU3RqZURGSU5HZHlTSEZCVW10U1Z6TjJSV3RXZGxKMmNYQnZiR3RYYm1ObGRrMUJWRFpFYzFCelZWcDZaalpWZUZkMWRURklUM0pwZVRKcVdWQnVORVJWU0c5dFIyOWpVVEZaWmtjeU5FUnpaa1YwWTFveVpXZ3lkWElyZVRCTldHOXFXVUpLTmpGWVEyTnRjRFJEY2tsNFF5dEJZVXd2WkVnclQwbEhOSE14YTNGcmRHcFJibVpTVEVwRFVuRjVTRkpYZVVOSkwxYzRSVkJPTWtJelMyZHJXRTl2V20weVVIVk9VRzRyUkdST01HWnBiWFZ6UlVFMWRUVmlVSFp3VURFck0zRXJSa281VG1ONVFWTjFaVmd6UldwME9GSkhXbVozVm1kVWVrZHpjQ3R5ZUcxV1VWUTFRVkUwTkVaSGEzSjBRWGQxVmxsVlUyMTNRVFpSY21adVUwaHpjWGxNTWpSUGVsRkdabk5yWlZsdVEwWm5RbEptVEVodVlWUTBUVFZIVDNSaWJXZEtUV2xOUms1WFYxaFZWemxuYkVOUmJqbFJhMnh0T1VSUE5YWlBUQ3RYWlZoSWRHaFdibFJ4TDFRelZrbFdlazFDUzJwVFR6TkxSRVZMYlc1cFV6VkRjRGhKYVhOSE9HMXVjM2hIZDA4emRrODVVbmRJU1RFMlJ6QXZaWEF2Y1dkRVRGVnBOVXNyU1VOemFVdzNhVUozUW1OSWNsRlVXbGxNY1dOeFdEQm9URlpKT1ZWSU4zWnhkakJaUVhkV1lsSTNXbXhySzFKeVFVWkVTMHRhUjJzMmMxUlFhMDluWjJ3emVFcGFVbFZwVEd0TmVHdFhSVmt5UjBacVJGQTNRekFyVURaRVRreEpVVmxDYUVVM1pHZEdSSE13UzFKQ1UxQldaVkJTVW5sek5qVldiM1psT0cxa09IbDNiME5HZFRVMFFsYzRSa2hOUkhsRFQxSnBOWEJvWWtOYVQzVk1aa3hLVjB4M2NUa3ZUakZtVFdoWU9YQkpNR2xEWkhkTVZWTmphRXRWZVRaemFXVjRXamRFVG05blkzaG9Wa2xOTWxOU2EzaHZORlo2VkhWWGRYSjZSRGxoT0Zob2NWbDRNak4zUVd3MlRYSjBZMDFoVFQwPQ--");
                }
            }
            
            //if(event=="loaderror"){
                
                
                if(data == "manifestLoadError (networkError)" || data == "not found" || data == "Media failed to decode"){
                    //reloadWithPost({ fallback_url_path: ''});
                    // checkAndLogUrlStatus();
                    // logToServerAndRedirect(pm_player_data);
                    // window.location.replace("https://cloudnestra.comNmMwYTI2YTk1ODg2NGUxNzNlYmU4Zjg5ZTk0ZTY2NDA6YUVKTloyTXdXV2cyYVhBNGVGVmlXVEZPU2pWTGJtNVZOWFV4WWtWSmIyeExNMDByUVVkVVZXcFRhRUY1VFRSdmRpdFhSMW8wTDFGbmVqUnhUM05JYTFaT1ZraFNZMVlyTUVoTlZETmhORVkwZWpsSlJHRXJhV3htVFhsaU9GVnZVbXhoVHpKRlNrZDZVRzlSUjNnNFdubEhkakZVUlZWbFNrRnRZM2h5TDFOakt6aHpaM0I0ZURVME9YZEZhek5yWm1aeWJFSldiVW8wUXpoM1dYcEZkazlFTTJ0bGQyZGhRVTVZY2taS1ZHNUdXRnBwT0ZKTWNtaFphRUZZTVhGTk0yMWxUSGxhUm1WSWNYZFhNRmx4T0ZSbmFFYzFZek01YVRsNVJGSTNTa3RZTUhGMVFuVTJla0ZLUWpGQ0swbENMMDV1VHl0d2FFeERNbVl2V2s1NmRIZ3paMEZZVGpabWRFczRhRWhQUmpsWU1sSTFhMVJST1VoaVEzZ3pORWRaWVRkWllXUXlaM0p3ZUZSa1pGTTJhbTV6YURsT2NYcExlak4yVEhsVFJHWjNkVGhyTDIxWmQwNWlRV3A2Y1d4aFNtTnVTa296YjFoM1MxcHBVMWR3UjI4MGNUTTNibXRYVlc0MVYwa3ZaSGMxSzAxdVQzRjVWM2RwU2pSdmNHczVSWE56TjJzMWMxa3hSbmxwTTJWUVVGZERUMlV3TWtSNVNqTkpVRU5EZDJ3NFFqbHZZV2RJTXpsblFrNXNkVzFSVEZWeU5FOWhXWEpHTmlzdmFWZG9ZMlZhVWsxVmEwVXhWbU5PZWtOdWNtRk5jRlZVWTJkR2RXZGhjMlpQTUVKT1puVmhOVVp0VjNwU1RFRXpTM2hoZFRoMWJTdENUbm9yYlVwTWJ6VnhUSHA2ZVd4RmIxQlFSVGw0UjBjeUwzcFNTWFJzWnpka2ExUjVVemxoTTFRNFkxUTNjbVYxVERGbFkzWm5NaTlSVmtKMk5URm9hWE5FV2tJclJucE1jMFJVS3poMmJsUmlUQ3RsZFVFclpFOXZhR3B0VjIxNk1FOVdhR0pNUWtWSFNsTjJNVFZPTDNCT1dFcFJNbUpSVTJJeU5rdENTVFZXVTJ4bVpVVlVkVXRLYUd0b2JGZDNWVGhVWkRVME9YcG1NMmt2YW1WT1pHcFNabEZaUzA5alZubGlMMkpqUVRsbGVFUTFLemcyUWxwR2NEUkpRekJLSzFkNlFXNDVOVmxaUkZkdldqRjBZVUl4TTBKVFkxRjRlV3RoTlhwMWQwWmhNM2MwVVcxb1MxUjRaMVI2WTBwUmMybFFkU3RqZURGSU5HZHlTSEZCVW10U1Z6TjJSV3RXZGxKMmNYQnZiR3RYYm1ObGRrMUJWRFpFYzFCelZWcDZaalpWZUZkMWRURklUM0pwZVRKcVdWQnVORVJWU0c5dFIyOWpVVEZaWmtjeU5FUnpaa1YwWTFveVpXZ3lkWElyZVRCTldHOXFXVUpLTmpGWVEyTnRjRFJEY2tsNFF5dEJZVXd2WkVnclQwbEhOSE14YTNGcmRHcFJibVpTVEVwRFVuRjVTRkpYZVVOSkwxYzRSVkJPTWtJelMyZHJXRTl2V20weVVIVk9VRzRyUkdST01HWnBiWFZ6UlVFMWRUVmlVSFp3VURFck0zRXJSa281VG1ONVFWTjFaVmd6UldwME9GSkhXbVozVm1kVWVrZHpjQ3R5ZUcxV1VWUTFRVkUwTkVaSGEzSjBRWGQxVmxsVlUyMTNRVFpSY21adVUwaHpjWGxNTWpSUGVsRkdabk5yWlZsdVEwWm5RbEptVEVodVlWUTBUVFZIVDNSaWJXZEtUV2xOUms1WFYxaFZWemxuYkVOUmJqbFJhMnh0T1VSUE5YWlBUQ3RYWlZoSWRHaFdibFJ4TDFRelZrbFdlazFDUzJwVFR6TkxSRVZMYlc1cFV6VkRjRGhKYVhOSE9HMXVjM2hIZDA4emRrODVVbmRJU1RFMlJ6QXZaWEF2Y1dkRVRGVnBOVXNyU1VOemFVdzNhVUozUW1OSWNsRlVXbGxNY1dOeFdEQm9URlpKT1ZWSU4zWnhkakJaUVhkV1lsSTNXbXhySzFKeVFVWkVTMHRhUjJzMmMxUlFhMDluWjJ3emVFcGFVbFZwVEd0TmVHdFhSVmt5UjBacVJGQTNRekFyVURaRVRreEpVVmxDYUVVM1pHZEdSSE13UzFKQ1UxQldaVkJTVW5sek5qVldiM1psT0cxa09IbDNiME5HZFRVMFFsYzRSa2hOUkhsRFQxSnBOWEJvWWtOYVQzVk1aa3hLVjB4M2NUa3ZUakZtVFdoWU9YQkpNR2xEWkhkTVZWTmphRXRWZVRaemFXVjRXamRFVG05blkzaG9Wa2xOTWxOU2EzaHZORlo2VkhWWGRYSjZSRGxoT0Zob2NWbDRNak4zUVd3MlRYSjBZMDFoVFQwPQ--");
                }
            //}
            
            if(event=="duration"){
                if(watched.duration == 0){
                    watched.setDur(parseInt(player.api("duration")));
                    
                    pm_player_data.data.duration = parseInt(player.api("duration"));
                    pm_player_data.data.event = "timeupdate";
                    window.parent.postMessage(pm_player_data , '*');   
                }
            }
            
            if(event == "subtitle"){
                var sub_lang = get_lang_from_name(data);
                sub_shown_lang = sub_lang.ISO639;
            }
        }
        
        
        function openVidsrc(){
            var win = window.open('https://vidsrcme.ru/', '_blank');
            if (win) {
                //Browser has allowed it to be opened
                win.focus();
            }
        }
        
        
        
        
        window.addEventListener('message', message => {
            if (message.source == window) {
                return; // Skip message in this event listener
            }
            
            if(message.source == window.parent){
                if(isJson(message.data)){
                    message_data = JSON.parse(message.data);
                    if(message_data.player === true){
                        if(message_data.action == "play"){
                            player.api("play");
                        }
                        if(message_data.action == "pause"){
                            player.api("pause");
                        }
                        
                        if(message_data.action == "mute"){
                            player.api("mute");
                        }
                        
                        if(message_data.action == "unmute"){
                            player.api("unmute");
                        }
                        
                        if(message_data.action.includes("seek")){
                            var seek_match = message_data.action.match(/seek(\+|-)([0-9]+)/);
                            if(seek_match.length){
                                player.api("seek",seek_match[1]+seek_match[2])
                            }
                        }
                    }
                }
            }
        });
        
        
        
        function IsLcOn(){
            var is_on = false;
            try {
                localStorage.setItem('test_lc' , "1");
                if(localStorage.getItem('test_lc') == "1"){
                    is_on = true
                }
            }
            catch(err) {
                return false;
            }
            
            return is_on;
        }
        
        function isJson(str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        }
        
        function domain_valid(domain) {
            // Regular expression to validate domain format
            var domainPattern = /^([a-zA-Z0-9.-]+)?[a-zA-Z0-9-]\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;

            return domainPattern.test(domain);
        }
        
        
        function reloadWithPost(data) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = window.location.href.split('?')[0];
            
            for (const key in data) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = data[key];
                form.appendChild(input);
            }
            
            document.body.appendChild(form);
            form.submit();
        }
        
        
        // Function to check single URL and log status code
        function checkAndLogUrlStatus() {
            $.ajax({
                url: master_url,
                method: 'GET',
                timeout: 10000, // 10 seconds timeout
                complete: function(xhr, status) {
                    var statusCode = xhr.status;
                    var statusText = xhr.statusText;
                    
                    // Prepare log data
                    var logData = {
                        url: master_url,
                        status_code: statusCode,
                        status_text: statusText,
                        request_status: status, // "success", "error", "timeout"
                        timestamp: new Date().toISOString(),
                        user_agent: navigator.userAgent,
                        referrer: document.referrer
                    };
                    
                    console.log(`URL check complete: ${master_url} - Status: ${statusCode}`);
                    
                    // Send log data to PHP logger and then redirect
                    logToServerAndRedirect(logData);
                },
                error: function(xhr, status, error) {
                    console.error('URL check failed:', error);
                    
                    // Log the failure and redirect anyway
                    var logData = {
                        url: master_url,
                        status_code: 0,
                        status_text: 'Check Failed',
                        request_status: status,
                        timestamp: new Date().toISOString(),
                        user_agent: navigator.userAgent,
                        referrer: document.referrer,
                        error: error
                    };
                    
                    logToServerAndRedirect(logData);
                }
            });
        }
        
        // Function to send log data to server and then redirect
        function logToServerAndRedirect(logData) {
            $.ajax({
                url: '/http_check.php',
                method: 'POST',
                data: logData,
                success: function(response) {
                    console.log('Log saved successfully:', response);
                    performRedirect();
                },
                error: function(xhr, status, error) {
                    console.error('Failed to save log:', error);
                    // Still redirect even if logging fails
                    performRedirect();
                }
            });
        }
        
        // function to sent log data to server
        function logToServer(logData) {
            $.ajax({
                url: '/http_check.php',
                method: 'POST',
                data: logData,
                success: function(response) {
                    console.log('Log saved successfully:', response);
                },
                error: function(xhr, status, error) {
                    console.error('Failed to save log:', error);
                }
            });
        }
        
        // Perform the redirect
        function performRedirect() {
            window.location.replace(fallback_url);
        }
        
        
        // Observe all network requests
        const performanceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name.includes('.m3u8') && entry.name.includes('putgate')) {
                var new_pass_obj = new URL(entry.name);
                var old_pass_obj = new URL("https:"+pass_path);
                pass_path = pass_path.replace(old_pass_obj.hostname,new_pass_obj.hostname);
                restart_ping_interval();
            }
          });
        });
        
        // Start observing
        performanceObserver.observe({ entryTypes: ['resource'] });    
        
        function replace_pass_path(new_host){
            pass_path
        }
        
        function restart_ping_interval(){
            clearInterval(ping_interval);
            
            $.get(pass_path);
            
            ping_interval = setInterval(function(){ 
                $.get(pass_path, function(data, status){
                    //console.log(data);
                });
            }, 60000);
        }