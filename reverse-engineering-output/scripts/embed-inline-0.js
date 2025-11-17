var lc_on = IsLcOn();
    
    var the_iframe = document.getElementById('player_iframe');
    
    
    
    current_sub_name = "sub_"+$("body").data("i");
    if ($("body").data("s") && $("body").data("e")){
        current_sub_name += "_"+$("body").data("s")+"x"+$("body").data("e");
    }
    
    
    var lc_pro_cc = true;
    
    
    var current_sub_data = 0;
    
    if(lc_on){
        var current_sub_data_tmp = JSON.parse(localStorage.getItem(current_sub_name));
    }
    
    
    var sub_hash = 'a35c0d4e09e07870a21359b42263d327';
    /*
    if(current_sub_data_tmp != null){
        if (typeof current_sub_data_tmp === 'object'){
            //console.log(current_sub_data_tmp);
            if(current_sub_data_tmp.sub_hash == sub_hash)
                current_sub_data = current_sub_data_tmp;
        }
    }
    */    
    // pm redirector
    window.addEventListener('message', message => {
        if (message.source == window) {
            return; // Skip message in this event listener
        }
        
        if(message.data.type == "PLAYER_EVENT"){
            //console.log(message.data);
        }
        
        if(message.data == "reload_page"){
            window.location.reload();
        }
        
        if(message.data == "tvfull"){
            $(".servers")[0].css('left', '100px');
        }
        
        if(message.source == window.parent){
            var the_iframe = document.getElementById('player_iframe');
            the_iframe.contentWindow.postMessage(message.data,'*');
        }else{
            window.parent.postMessage(message.data , '*');
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
    
    $("#iFrameId").on("load", function () {
        
    });
    
    $("#ad720 #close").click(function(){
        $(this).parent().parent().hide();
        $.cookie("ad720", "1" , 
            { 
                expires : 0.001, 
                path: "/;SameSite=None", 
                secure: true
            }
        );
        
    });
    
    $(document).ready(function(){
        
        $(".servers").show();
            
        if(window.frameElement === null){
            $("#top_buttons_parent").show();
        }else{
            var ref = window.frameElement.getAttribute('data-ref');
            if(ref != null){
                $(".servers").css("left","100px")
                
                if(ref.length > 3){
                    $.get("/is_vip_str.php?ref="+encodeURIComponent(ref), function(data, status){
                        if(data == "1"){
                            $("#top_buttons_parent").hide();
                        }else{
                            $("#top_buttons_parent").show();
                        }
                    });
                }else{
                    $("#top_buttons_parent").show();
                }
            }else{
                $("#top_buttons_parent").show();
            }
        }
    });