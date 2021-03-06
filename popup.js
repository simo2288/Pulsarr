var apiUrl = null;
var imagepath = null;
var title = null;
var year = null;
var description = null;
var profileId = 1;
var monitored = false;
var minAvailId = "announced";

document.addEventListener("DOMContentLoaded", function() {
    $("#popup").fadeTo("fast", 0.5);
    $("#spin").spin();
    $("#popup").addClass("unclickable");
});


const noMovie = {
    "status": 404,
    "text": [
        {
            "images": [
                {
                    "coverType": "poster",
                    "url": "/img/black-hole-poster.jpg"
                }],
            "overview": "Oh no! Pulsarr has colapsed into a black hole. Please check your configuration and that you are on a valid IMDB movie page (not TV series).",
            "title": "Black Hole",
            "year": 404
        }
    ]
};


getCurrentTabUrl(function (url) {
    if (radarrExt.config.getHost() != null) {
        apiUrl = radarrExt.config.getApiUrl();

        var imdb = extractIMDBID(url);
        radarrExt.lookupMovie(imdb);
    } else {
        chrome.runtime.openOptionsPage();
    }

    $('#config').on('click', function () {
        chrome.runtime.openOptionsPage();
    });
});

jQuery.fn.changepanel = function () {
    $('#image').attr("src", imagepath);
    var innertitle = title + "<span> (" + year + ")</span>";
    $('#title').html(innertitle);
    $('#description').html(description);

    $('#description').each(function () {
        var content = $(this).html(),
            char = 140;
        if (content.length > char) {
            var tmpmaincontent = content.substr(0, char);
            var last = tmpmaincontent.lastIndexOf(' ');
            var maincontent = content.substr(0, last);
            var pluscontent = content.substr(last, content.length - last);
            var html = maincontent + '<p class="more">' + pluscontent + '&nbsp;</p><button id="dotdotdot" class="dotbutton">(...)&nbsp;</button>';
            $(this).html(html);
        }
    });

    $("#dotdotdot").on('click', function () {
        var moreText = "(...)";
        var lessText = "(less)";
        var $this = $(this);
        $this.text($this.text() == lessText ? moreText : lessText);
        $(".more").slideToggle();
    });
};

$("#monitored").change(function () {
    if ($(this).prop("checked") == true) {
        monitored = true;
    } else {
        monitored = false;
    }
});

$('#profile').on('change', function () {
    profileId = this.value;
});

$('#minAvail').on('change', function () {
    minAvailId = this.value;
});

function getCurrentTabUrl(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function (tabs) {
        var tab = tabs[0];
        var url = tab.url;

        callback(url);
    });
}

function extractIMDBID(url) {
    var regex = new RegExp("\/tt\\d{7}\/");
    imdbid = regex.exec(url);

    return (imdbid) ? imdbid[0].slice(1, 10) : null;
}


radarrExt = {

    config: {
        getRootPath: function () {
            return radarrExt.server.get("rootfolder", "").text[0].path;
        },

        getHost: function () {
            return localStorage.getItem('host');
        },

        getPort: function () {
            var savedPort = localStorage.getItem('port');

            if (savedPort != "") {
                return ":" + savedPort;
            } else {
                return "";
            };
        },

        getApi: function () {
            return localStorage.getItem('apikey');
        },

        getApiUrl: function () {
            return radarrExt.config.getHost() + radarrExt.config.getPort() + "/api/";
        },
    },

    server: {
        get: function (endpoint, params) {
            return new Promise(function (resolve, reject) {
                var http = new XMLHttpRequest();
                var url = apiUrl + endpoint + "?" + params;

                http.open("GET", url, true);
                http.setRequestHeader("X-Api-Key", radarrExt.config.getApi());

                http.onload = function () {
                    if (this.status === 200) {
                        results = { "text": JSON.parse(http.responseText), "status": http.status };
                        resolve(results);
                    }
                    else {
                        reject(Error(http.statusText));
                    }
                };

                http.onerror = function () {
                    reject(Error("Network Error"));
                };

                http.send();

            });

        },

        post: function (endpoint, params) {
            return new Promise(function (resolve, reject) {
                var http = new XMLHttpRequest();
                var url = apiUrl + endpoint;

                http.open("POST", url, true);
                http.setRequestHeader("X-Api-Key", radarrExt.config.getApi());

                http.onload = function () {
                    if (this.status === 201) {
                        results = { "text": JSON.parse(http.responseText), "status": http.status };
                        resolve(results);
                    }
                    else {
                        reject(Error(http.statusText));
                    }
                };

                http.onerror = function () {
                    console.log(http);
                    reject(Error("Network Error"));
                };

                http.send(JSON.stringify(params));

            });
        }
    },

    popup: {
        init: function (movie) {
            $("#popup").stop(true).fadeTo('fast', 1);
            $("#popup").removeClass("unclickable");
            $("#spin").spin(false);


            imagepath = movie.text[0].images[0].url;
            title = movie.text[0].title;
            year = movie.text[0].year;
            description = movie.text[0].overview;
            if (movie.status == 200) {
                radarrExt.popup.profilesById();
                radarrExt.popup.restoreSettings();
            }            
            $('body').changepanel();

            $("#options").removeClass("hidden");
            $("#buttons").removeClass("hidden");

            $('#add').on('click', function () {
                radarrExt.addMovie(movie.text[0], profileId, monitored, minAvailId);
            });
        },

        info: function(text){
            $('#serverResponse').text(text);
            $("#serverResponse").removeClass("hidden");
        },

        saveSettings: function (monitored, qualityId, minAvail) {
            localStorage.setItem("monitored", monitored);
            localStorage.setItem("profile", qualityId);
            localStorage.setItem("minAvail", minAvail);
        },

        restoreSettings:function(){
            if (localStorage.getItem("monitored") == "true") {
                $('#monitored').bootstrapToggle('on');
            } else {
                $('#monitored').bootstrapToggle('off');
            };

            if (localStorage.getItem("minAvail") != null) {
                $('#minAvail').val(localStorage.getItem("minAvail"));
            };
        },

        profilesById: function () {
            radarrExt.server.get("profile", "").then(function (response) {
                var profiles = response.text;
                for (var i = 0; i < profiles.length; i++) {
                    $('#profile')
                        .append($('<option>', { value: profiles[i].id })
                        .text(profiles[i].name));
                }
                if (localStorage.getItem("profile") != null && (localStorage.getItem("profile") <= $('#profile').children('option').length)) {
                    $('#profile').prop('selectedIndex', localStorage.getItem("profile") - 1);
                };
            }).catch(function (error) {
                radarrExt.popup.info("profilesById Failed! " + error)
            });
        }
    },


    lookupMovie: function (imdbid) {
        radarrExt.server.get("movies/lookup", "term=imdbid%3A%20" + imdbid).then(function (response) {
            radarrExt.popup.init(response);
        }).catch(function (error) {
            radarrExt.popup.init(noMovie);
            $("#options").addClass("hidden");
            $("#btnAdd").addClass("hidden");
            radarrExt.popup.info(error + ": Failed to find movie! Please check you are on a valid IMDB movie page (not TV series).")
        })
    },


    addMovie: function (movie, qualityId, monitored, minAvail) {
        $("#popup").toggleClass("unclickable");
        $("#popup").fadeTo("fast", 0.5);
        $("#serverResponse").removeClass("hidden");
        $("#serverResponse").spin('large');
        radarrExt.server.get("rootfolder", "").then(function (response) {
            var newMovie = {
                "title": movie.title,
                "year": movie.year,
                "qualityProfileId": qualityId,
                "titleSlug": movie.titleSlug,
                "images": [
                  {
                      "coverType": "poster",
                      "url": null
                  },
                  {
                      "coverType": "banner",
                      "url": null
                  }
                ],
                "tmdbid": movie.tmdbId,
                "rootFolderPath": response.text[0].path,
                "monitored": monitored,
                "minimumAvailability": minAvail
            };

            radarrExt.server.post("movie", newMovie).then(function (response) {
                radarrExt.popup.saveSettings(monitored, qualityId, minAvail);
                $("#popup").stop(true).fadeTo('fast', 1);
                $('#serverResponse').text("Movie added to Radarr!");
                $("#serverResponse").removeClass("hidden");
                setTimeout(function () {
                    window.close();
                }, 1500);
                $("#popup").removeClass("unclickable");
            }).catch(function (error) {
                $("#popup").stop(true).fadeTo('fast', 1);
                radarrExt.popup.info(error + ": Failed to add movie! Please check it is not already in your collection.");
                $("#popup").toggleClass("unclickable");
            });

        }).catch(function (error) {
            $("#popup").stop(true).fadeTo('fast', 1);
            radarrExt.popup.info(error + ": Failed to add movie! ");
            $("#popup").removeClass("unclickable");
        })
    },

}

