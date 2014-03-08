// Sketch of browsercast / revealjs integration.
(function (global, document) {


    /**
     * [from revealjs]
     * Extend object a with the properties of object b.
     * If there's a conflict, object b takes precedence.
     */
    function extend(a, b) {
        for (var i in b) {
            a[i] = b[i];
        }
    }

    /**
     * [from revealjs]
     * Converts the target object to an array.
     */
    function toArray( o ) {
        return Array.prototype.slice.call( o );
    }

    function SlideCue(time, slideIndex) {
        this.time = time;
        this.slideIndex = slideIndex;
    }

    SlideCue.prototype = {
        focus: function () {
            Reveal.slide(this.slideIndex);
        }
    };

    function FragmentCue(time, slideIndex, fragmentIndex) {
        this.time = time;
        this.slideIndex = slideIndex;
        this.fragmentIndex = fragmentIndex;
    }

    FragmentCue.prototype.focus = function () {
        var slide, slideFragments, indexv = 0;
        slide = Reveal.getSlide(this.slideIndex);
        if (Reveal.getIndices()['h'] !== this.slideIndex) {
            Reveal.slide(this.slideIndex);
        }
        slideFragments = slide.getElementsByClassName('fragment');

        Reveal.slide(this.slideIndex, indexv, this.fragmentIndex);
    };

    function getSectionFragmentCues(section, slideIndex) {
        var fragmentTags, fragmentTag, cue, cueTime, fragmentCues, i;
        fragmentTags = section.getElementsByClassName('fragment');

        fragmentCues = [];
        for (i = 0; i < fragmentTags.length; i += 1) {
            fragmentTag = fragmentTags[i];
            cueTime = parseCueTime(fragmentTag);
            cue = new FragmentCue(
                cueTime,
                slideIndex,
                i
            );
            fragmentCues.push(cue);
        }
        return fragmentCues;
    }

    function parseCueTime(tag) {
        return parseFloat(tag.attributes['data-bccue'].value);
    }

    function seconds2time (seconds) {
        var hours   = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds - (hours * 3600)) / 60);
        var seconds = Math.floor(seconds - (hours * 3600) - (minutes * 60));
        var time = "";
        if (hours != 0) {
          time = hours+":";
        }
        if (minutes != 0 || time !== "") {
          minutes = (minutes < 10 && time !== "") ? "0"+minutes : String(minutes);
          time += minutes+":";
        }
        if (time === "") {
          time = "0:"+seconds;
        }
        else {
          time += (seconds < 10) ? "0"+seconds : String(seconds);
        }
        return time;
    }

    function getSlideCues() {
        var slides, slideCues, cue, cueTime, subCues;
        // Get a list of the slides and their cue times.
        slides = document.getElementsByTagName('section');
        slideCues = [];
        for (i = 0; i < slides.length; i += 1) {
            if (typeof slides[i].attributes['data-bccue'] !== 'undefined') {
                cueTime = parseCueTime(slides[i]);
                cue = new SlideCue(cueTime, i);
                slideCues.push(cue);
                subCues = getSectionFragmentCues(slides[i], i);
                slideCues = slideCues.concat(subCues);
            }
        }
        return slideCues;
    }

    function setCueLength(popcorn) {
        var markers, markerLength, divs, slideCues, timeLength;
        slideCues = getSlideCues();
        markers = document.getElementById('markers');
        audioControls = document.getElementById('audio-controls');
        playPause = document.getElementById('play-pause');
        timeDiv = document.getElementById('time');
        mute = document.getElementById('mute');
        volumeBar = document.getElementById('volume-bar');
        markerTotalLength = audioControls.offsetWidth - (
            playPause.offsetWidth + timeDiv.offsetWidth +
            volumeBar.offsetWidth + mute.offsetWidth + 50)
        markers.setAttribute(
            "style","width:" + markerTotalLength + "px;");
        var sum = 0;
        var totalTime = popcorn.duration();
        divs = document.getElementsByClassName('cue');
        var length = divs.length;
        for (var i = 0; i < length; i++) {
            try {
                timeLength = slideCues[i+1].time - slideCues[i].time;
            } catch (e) {
                timeLength = totalTime - slideCues[i].time;
            }
            var left = (slideCues[i].time/totalTime)*100;
            markerLength = markerTotalLength * (timeLength/totalTime);
            // Firefox workaround. Somehow sum is always infinitesimally
            // greater that the actual width.
            if (i == length-1) {
                var x = Math.floor(markerTotalLength-sum);
                divs[i].setAttribute(
                    "style","width:" + x + "px;")
            } else {
                divs[i].setAttribute(
                    "style","width:" + markerLength + "px;");
            }
            sum = sum + markerLength;
        };
    }

    function onCueClick(cue, popcorn) {
       popcorn.currentTime(cue.time);
    }

    function onTimeUpdate() {
        percentage = (this.currentTime/this.duration)*100;
        var markers = document.getElementById('markers');
        var currentTimeSpan = document.getElementById("current-time");
        currentTimeSpan.innerHTML = seconds2time(this.currentTime);
        col1 = "#abc";
        col2 = "#e3e3e3";
        markers.style.background = "-moz-linear-gradient(left,"+col1+" "+percentage+"%, "+col2+" "+percentage+"%)";
        markers.style.background = "-o-linear-gradient(left center,"+col1+" "+percentage+"%, "+col2+" "+percentage+"%)";
        markers.style.background = "-webkit-linear-gradient(left,"+col1+" "+percentage+"%, "+col2+" "+percentage+"%)";
        markers.style.background = "linear-gradient(left center,"+col1+" "+percentage+"%, "+col2+" "+percentage+"%)";
    }

    // Use the audio timeupdates to drive existing slides.
    function playBrowserCast() {
        var audio, slideCues, popcorn, markers, div;

        slideCues = getSlideCues();

        // Look for the browsercast audio element.
        audio = document.getElementById('browsercast-audio');
        markers = document.getElementById('markers');

        // Buttons
        var playButton = document.getElementById("play-pause");
        var muteButton = document.getElementById("mute");
        var volumeBar = document.getElementById("volume-bar");
        var durationSpan = document.getElementById("duration");

        popcorn = Popcorn(audio);

        audio.addEventListener('timeupdate', onTimeUpdate);
        // Event listener for the play/pause button
        playButton.addEventListener("click", function() {
            if (audio.paused == true) {
                audio.play();
                playButton.classList.remove('play');
                playButton.classList.add('pause');
            } else {
                audio.pause();
                playButton.classList.remove('pause');
                playButton.classList.add('play');
            }
        });
        // Event listener for the mute button
        muteButton.addEventListener("click", function() {
            if (audio.muted == false) {
                audio.muted = true;
                muteButton.classList.remove('mute');
                muteButton.classList.add('unmute');;
            } else {
                audio.muted = false;
                muteButton.classList.remove('unmute');
                muteButton.classList.add('mute');
            }
        });

        // Event listener for the volume bar
        volumeBar.addEventListener("change", function() {
            audio.volume = volumeBar.value;
        });

        var i = 0;
        slideCues.forEach(function (cue) {
            div = document.createElement('div');
            div.className = 'cue';
            div.setAttribute('data', "time:"+cue.time);
            cue.div = div;
            div.onclick = function(event) {
                return onCueClick.call(this, cue, popcorn);
            };
            markers.appendChild(div);

            popcorn.cue(i++, cue.time, function () {
                transitionLock = true;
                cue.focus();
                transitionLock = false;
            });
        });

        if (popcorn.readyState() > 0) {
            durationSpan.innerHTML = seconds2time(popcorn.duration());
            setCueLength(popcorn);
        } else{
            audio.addEventListener('loadedmetadata', function(event) {
                durationSpan.innerHTML = seconds2time(popcorn.duration());
                return setCueLength.call(this, popcorn);
            });
        };


        window.onresize = function(event) {
            return setCueLength.call(this, popcorn);
        };

        // lock for preventing slidechanged event handler during timeupdate handler.
        // TODO using a mutex seems clunky.
        var transitionLock = false;

        // Decorator for creating an event handler that doesn't run
        // when the lock is active.
        var ifNotLocked = function (f) {
            return function (event) {
                if (!transitionLock) {
                    f(event);
                }
            };
        };

        Reveal.addEventListener('slidechanged', ifNotLocked(function (event) {
            var cueTimeRaw, cueTime, indexh, newSlide, i, frags;

            // For some reason event.currentSlide refers to the slide we just left instead of the one we're navigating to.
            indexh = event.indexh;

            // Extract the desired audio time from the target slide and seek to that time.
            newSlide = Reveal.getSlide(indexh);
            cueTime = parseCueTime(newSlide);
            popcorn.currentTime(cueTime);

            frags = newSlide.getElementsByClassName('fragment');
            toArray(frags).forEach(function (frag) {
                frag.classList.remove('visible');
                frag.classList.remove('current-fragment');
            });

            // If the slide changed after the 'cast finished, get the audio moving again.
            audio.play();
        }));

        var fragmentHandler = ifNotLocked(function (event) {
            var indices, cs, targetFrag;
            indices = Reveal.getIndices();

            if (indices['f'] === -1) {
                popcorn.currentTime(parseCueTime(Reveal.getSlide(indices['h'])));
            } else {
                cs = Reveal.getCurrentSlide();
                targetFrag = cs.querySelector('[data-fragment-index="' + indices['f'] + '"]');
                popcorn.currentTime(parseCueTime(targetFrag));
            }
        });

        Reveal.addEventListener('fragmenthidden', fragmentHandler);

        Reveal.addEventListener('fragmentshown', fragmentHandler);

        // Start the 'cast!
        audio.play();

        // Bind space to pause/play instead of the Reveal.js default.
        Reveal.configure({
            keyboard: {
                32: function () {
                    if (popcorn.paused() === true) {
                        popcorn.play()
                    } else {
                        popcorn.pause()
                    }
                }
            }
        });
    }

    // Start recording a 'cast
    // In the end you can get the slide HTML with the cue attributes set
    // by running:
    //        browsercastRecorder.getHTMLSlides()
    // in the Javascript console.
    //
    // Press "Left" on the first slide to start recording.
    function recordBrowserCast() {
        Reveal.navigateTo(0);
        function CuePointTracker() {
            this.currentIndex = 0; // assume starting on first slide. not great.
            this.cuePoints = [];
            this.addCuePoint = function (ts) {
                var cp = {
                    ts: ts,
                    index: this.currentIndex
                };
                this.cuePoints.push(cp);
                this.currentIndex += 1;
            };

            this.getStartTS = function () {
                var first = this.cuePoints[0];
                return first.ts;
            };

            this.getHTMLSlides = function () {
                var slides, src, i, start, slideDiv;
                start = this.getStartTS();
                slides = document.getElementsByTagName('section');
                for (i = 0; i < this.cuePoints.length; i += 1) {
                    slides[i].attributes['data-bccue'].value = (this.cuePoints[i].ts - start)/1000.0;

                }
                slideDiv = document.getElementsByClassName('slides')[0];
                return slideDiv.innerHTML;
            };
        }

        var tracker = new CuePointTracker();
        global.browsercastRecorder = tracker;

        document.addEventListener('keydown', function (event) {
            if (event.keyIdentifier === 'Left' || event.keyIdentifier === 'Right') {
                var ts = event.timeStamp;
                tracker.addCuePoint(ts);
            }
        });
    }

    playBrowserCast();
})(window, window.document);
