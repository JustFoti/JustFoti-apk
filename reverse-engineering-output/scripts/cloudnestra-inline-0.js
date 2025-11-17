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
               src: '/prorcp/ZGFmYTQwMjU2ZDYzY2Y2OTZiYTcwMTdmZWJhNGRhNzQ6UkRsNlNVSTFVWFpsY0ZKQmNrOUVlalZzYkhSNGIyTjRTVTFvZEVKMVNHbHFla0prVXk5TWJteGxTM0ZyU0ZWeFRqRk9LMVJJVkRaS1NFMW9LMDV3YTJ0WVJHTTVNa0ppUm5VNFNVOWpja05VV0dJeVZuRlpMM0ZKT1ZwcGVFWm5TVUpEZFU0elEzUTFXa3h6T1doT1NVRkdTMnd5U0VOMVZEWkdjR0pxVGxSdllqSXhhRGRpVDA5TGFVaDVVRUl3ZGtoSGFFZHZNaXN4TWpWWGVGUjFUVmxRTDNGa09WTk5UbE5uTHpKU1NFVmtWM2hpTURGcmQyeGlOSEl3ZFVkcldtMWphVWRoVjFGMlZ6WmthalI0ZUhNeGRUVkxaV0ptYlU1TU1VTkZOVWhZTUUxYVVESTBNV3A2VVdWMU5tZEtSVzFoYTFSdE9XbzFaalZaZDJ4bVEwaG9VM2hYU0UxSVJpdHhUMk0wU0dOTVpuRnVaRkV2T0dkWmNFVmliVmwyWXprd1EzSmxOMFZzTUVSR1pYTkRORzAzVG5Kc2MwaFlObEJSUWs5Nk1VWjRWMjVhU1hWNk5YQTVZMmxEYVVoSVozRnRjbTlpVUdwb1NrcDViMWRQVjB3cmRrbHJLMHhaUW5oemFFWmhXa2xzZWxsTE5tMVhNbkE1ZW1OYU0yb3Jia3g1THpNMlVEZHZlamM0Y1hCbGRHSmxjR1JsVlhkMmRtcGpkVnA0ZFZKRmVEVjFRVVZzUTFodEt6RmtURXhwYlhkc1drbDBSekozZURaMlFtNW5Ua1p3ZW1OU1JHUnROVFExTkhoV2QxWlZhMFIyZVhoNVFWRnBiRmRDVmswM1lWbEpMMHhFYUU5WFlraFpWblJhTUhJMmJFTkVPRUkyYUhKdGJFUlRZamw1UmxGV1QwdFNlVFJZUTB4blRreHlVM2gzVW5sVmIyTmFMMmdyVDJ4SlN6UkpXRGRYZVVOclZUbG9kRnB2UjNWeWNscFBRM0UzV0dNNGNVeHNOVlpWY1VOcFdVVnRWa3BaWmtsTlpuRkhXa00yUjJwVlUzQlNTR1E0V0hKcFJuVm1Ta2xCYW1Wc1QxbEtWRkpzT1dsa1VsTk9PR1JsYzNBMWNIZFBUWHBsVWtGR2FGYzBkamhRZFUxbWVtOUhibXQwV25veWNqSlJUR3RxTkVnNVlqTkthakJqWVhneU1tMTJja2xMTjFVM2MyOHdVSEpaY201TFZGTnpPVkZPVlN0dU5FeEdVaXRETUM5TVpEbE9aakJqUzI4MFRUVnJlVXhhVEhoM1lqQkdlbVl5YVRGdk1GZExlRzloUzFWcWIyTnliWEJGYm1KdWJrSnpjVzl3ZERaWWVXc3lLM2RqV2xreFRtWnNSa052UzBGQmEyMW1UbGt4ZWxwWmIyZEZZa3RHUVhadFkxVmhlVmc1ZVVGWlkxbFhWMnBXYUcxa2JrTmhjV1E1Y1dwdk1tVXZSMUZ3U21SQmJVZEZhakpoWjFGNk1TdHFVa3RGVDNvMU1qRTJNREpXWm5KM2RERkZkakI1UldONWNWSkRiMGR1V1RKcFJXVlliMlZzWVVWRWVFOVpVMloyZEZBNVlXVktURFZOUlVGek5GRkRha1pFUkhsNFYxTnlNR1pOYmtGT2FXRklRa0pyZUZWT1JXSlFUVWhaWWl0alJEUXJOR2hVUlZoaVV6VlRiSGR0ZUdaYVRpOUthak5ZY0hKRmFGUm5NRTFKSzBocGFtUm9XbEJNYURSNGNVeDFlRk5UVm5wdWRsazJaVEZpZVhGaGFrRlBkbEJJWVd4T1NrOUJhekZCVlZWMGNuWnVhemd6T1hkT1l6QjVNSGhFTURneU5VVm9NekpVV25KR2ExSjBPRWxEUTNwa1FtNU9OMnRLVFZZMWFsWlJPR1E0ZEc5TmJuUnRTVVJpV2s1RFFrWTJRa2xWVDFCdmQxWkdjMW9yZEdaV1RUWXlkbUU0WTJWU09GbFNVbEJDTUdaa1ZXVkxlbUZ2UldjclJsZGhjVk5xT0dGcU1FNUNXRVZrUWpaYVZWRkhTVGsxVG5STGFFNVNSMFEzV1Znd05tVTFUSGxoY2sxUVZGVm1UR3RJWkdJM1lrVnlkVll6ZFZkU09HTlRSM2x3T1dka2VUbDBTSEJRV1ZSd2QyOU9PVGR2WkRsRWRreDVObVk1U21seGNVOXZiVnBITDA1b1JUUnNNekl6ZGpocGFtTndjMUZrZEhBeVVXbHFjbGM0TlROMGFUSm5WSGROVDJWbldtcFNUVnBvWjFwMFVrRXpURUZ6VWxWUFdsVlhSVVVyY1VOSVJUSkNTaXRaTWtwbVFUVlJZazVuWmxSaWMzQm9VWFJKYm1OM2VVODNkRVJ2VkZWaGNqaHFNSHB3Wm1SV2VtWTBSbkE1ZUdKWE9WTjNkMEZoVlRSMmNVMVNNVXBhYkRsalVVRmpSV3RQUlQwPQ--',
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