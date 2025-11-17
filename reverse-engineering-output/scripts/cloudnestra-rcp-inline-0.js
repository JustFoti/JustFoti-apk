/*
    $(document).ready(function(){
        
        
        if($.cookie('pop_asdf')){
            $("#pop_asdf").addClass("hidden");
        }
        
        $("#pop_asdf").click(function(){
            if(!$.cookie('pop_asdf')){
                if($.cookie('pop_asdf_tmp') >= 3){
                    var date = new Date();
                    date.setTime(date.getTime() + (10800 * 1000));
                    $.cookie('pop_asdf', 1, { expires: date });
                    $("#pop_asdf").addClass("hidden");
                }else{
                    var cookie_value = 1;
                    if($.cookie('pop_asdf_tmp'))
                        cookie_value = $.cookie('pop_asdf_tmp');
                        
                    cookie_value++;
                    
                    $.cookie('pop_asdf_tmp', cookie_value);
                    $(this).addClass("hidden");
                    setTimeout(function(){
                        $("#pop_asdf").removeClass("hidden");
                    }, 59000);
                }
            }
        });
    });
    */
    
        
    $("#pl_but_background , #pl_but").click(function(){
        loadIframe();
    });
    
        
    function loadIframe(data = 1){
        if(data == 1){
            $("#the_frame").removeAttr("style");
            $("#the_frame").html("");
            $('<iframe>', {
               id: 'player_iframe',
               src: '/prorcp/NmMwYTI2YTk1ODg2NGUxNzNlYmU4Zjg5ZTk0ZTY2NDA6YUVKTloyTXdXV2cyYVhBNGVGVmlXVEZPU2pWTGJtNVZOWFV4WWtWSmIyeExNMDByUVVkVVZXcFRhRUY1VFRSdmRpdFhSMW8wTDFGbmVqUnhUM05JYTFaT1ZraFNZMVlyTUVoTlZETmhORVkwZWpsSlJHRXJhV3htVFhsaU9GVnZVbXhoVHpKRlNrZDZVRzlSUjNnNFdubEhkakZVUlZWbFNrRnRZM2h5TDFOakt6aHpaM0I0ZURVME9YZEZhek5yWm1aeWJFSldiVW8wUXpoM1dYcEZkazlFTTJ0bGQyZGhRVTVZY2taS1ZHNUdXRnBwT0ZKTWNtaFphRUZZTVhGTk0yMWxUSGxhUm1WSWNYZFhNRmx4T0ZSbmFFYzFZek01YVRsNVJGSTNTa3RZTUhGMVFuVTJla0ZLUWpGQ0swbENMMDV1VHl0d2FFeERNbVl2V2s1NmRIZ3paMEZZVGpabWRFczRhRWhQUmpsWU1sSTFhMVJST1VoaVEzZ3pORWRaWVRkWllXUXlaM0p3ZUZSa1pGTTJhbTV6YURsT2NYcExlak4yVEhsVFJHWjNkVGhyTDIxWmQwNWlRV3A2Y1d4aFNtTnVTa296YjFoM1MxcHBVMWR3UjI4MGNUTTNibXRYVlc0MVYwa3ZaSGMxSzAxdVQzRjVWM2RwU2pSdmNHczVSWE56TjJzMWMxa3hSbmxwTTJWUVVGZERUMlV3TWtSNVNqTkpVRU5EZDJ3NFFqbHZZV2RJTXpsblFrNXNkVzFSVEZWeU5FOWhXWEpHTmlzdmFWZG9ZMlZhVWsxVmEwVXhWbU5PZWtOdWNtRk5jRlZVWTJkR2RXZGhjMlpQTUVKT1puVmhOVVp0VjNwU1RFRXpTM2hoZFRoMWJTdENUbm9yYlVwTWJ6VnhUSHA2ZVd4RmIxQlFSVGw0UjBjeUwzcFNTWFJzWnpka2ExUjVVemxoTTFRNFkxUTNjbVYxVERGbFkzWm5NaTlSVmtKMk5URm9hWE5FV2tJclJucE1jMFJVS3poMmJsUmlUQ3RsZFVFclpFOXZhR3B0VjIxNk1FOVdhR0pNUWtWSFNsTjJNVFZPTDNCT1dFcFJNbUpSVTJJeU5rdENTVFZXVTJ4bVpVVlVkVXRLYUd0b2JGZDNWVGhVWkRVME9YcG1NMmt2YW1WT1pHcFNabEZaUzA5alZubGlMMkpqUVRsbGVFUTFLemcyUWxwR2NEUkpRekJLSzFkNlFXNDVOVmxaUkZkdldqRjBZVUl4TTBKVFkxRjRlV3RoTlhwMWQwWmhNM2MwVVcxb1MxUjRaMVI2WTBwUmMybFFkU3RqZURGSU5HZHlTSEZCVW10U1Z6TjJSV3RXZGxKMmNYQnZiR3RYYm1ObGRrMUJWRFpFYzFCelZWcDZaalpWZUZkMWRURklUM0pwZVRKcVdWQnVORVJWU0c5dFIyOWpVVEZaWmtjeU5FUnpaa1YwWTFveVpXZ3lkWElyZVRCTldHOXFXVUpLTmpGWVEyTnRjRFJEY2tsNFF5dEJZVXd2WkVnclQwbEhOSE14YTNGcmRHcFJibVpTVEVwRFVuRjVTRkpYZVVOSkwxYzRSVkJPTWtJelMyZHJXRTl2V20weVVIVk9VRzRyUkdST01HWnBiWFZ6UlVFMWRUVmlVSFp3VURFck0zRXJSa281VG1ONVFWTjFaVmd6UldwME9GSkhXbVozVm1kVWVrZHpjQ3R5ZUcxV1VWUTFRVkUwTkVaSGEzSjBRWGQxVmxsVlUyMTNRVFpSY21adVUwaHpjWGxNTWpSUGVsRkdabk5yWlZsdVEwWm5RbEptVEVodVlWUTBUVFZIVDNSaWJXZEtUV2xOUms1WFYxaFZWemxuYkVOUmJqbFJhMnh0T1VSUE5YWlBUQ3RYWlZoSWRHaFdibFJ4TDFRelZrbFdlazFDUzJwVFR6TkxSRVZMYlc1cFV6VkRjRGhKYVhOSE9HMXVjM2hIZDA4emRrODVVbmRJU1RFMlJ6QXZaWEF2Y1dkRVRGVnBOVXNyU1VOemFVdzNhVUozUW1OSWNsRlVXbGxNY1dOeFdEQm9URlpKT1ZWSU4zWnhkakJaUVhkV1lsSTNXbXhySzFKeVFVWkVTMHRhUjJzMmMxUlFhMDluWjJ3emVFcGFVbFZwVEd0TmVHdFhSVmt5UjBacVJGQTNRekFyVURaRVRreEpVVmxDYUVVM1pHZEdSSE13UzFKQ1UxQldaVkJTVW5sek5qVldiM1psT0cxa09IbDNiME5HZFRVMFFsYzRSa2hOUkhsRFQxSnBOWEJvWWtOYVQzVk1aa3hLVjB4M2NUa3ZUakZtVFdoWU9YQkpNR2xEWkhkTVZWTmphRXRWZVRaemFXVjRXamRFVG05blkzaG9Wa2xOTWxOU2EzaHZORlo2VkhWWGRYSjZSRGxoT0Zob2NWbDRNak4zUVd3MlRYSjBZMDFoVFQwPQ--',
               frameborder: 0,
               scrolling: 'no',
               allowfullscreen: 'yes',
               allow: "autoplay",
               style: 'height: 100%; width: 100%;'
            }).appendTo('#the_frame');
            $("#player_iframe").on("load", function () {
                $("#the_frame").attr("style","background-image: none;");
            });
        }
    }
    
    // pm redirector
    window.addEventListener('message', message => {
        if (message.source == window) {
            return; // Skip message in this event listener
        }
        
        var the_iframe = document.getElementById('player_iframe');
        
        if(message.source == window.parent){
            the_iframe.contentWindow.postMessage(message.data,'*');
        }else{
            window.parent.postMessage(message.data , '*');
        }
        
        
        
    });