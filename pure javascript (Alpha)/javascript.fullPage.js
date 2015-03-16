/**
 * fullPage Pure Javascript v.0.0.2 (Alpha) - Not support given until Beta version.
 * https://github.com/alvarotrigo/fullPage.js
 * MIT licensed
 *
 * Copyright (C) 2013 alvarotrigo.com - A project by Alvaro Trigo
 */

(function(window, document, undefined){
	'use strict';

	window.fullpage = function(element, options){
		// Create some defaults, extending them with any options that were provided
		var defaults = {
			//navigation
			'menu': false,
			'anchors':[],
			'navigation': false,
			'navigationPosition': 'right',
			'navigationColor': '#000',
			'navigationTooltips': [],
			'slidesNavigation': false,
			'slidesNavPosition': 'bottom',
			'scrollBar': false,

			//scrolling
			'css3': true,
			'scrollingSpeed': 700,
			'autoScrolling': true,
			'fitToSection': true,
			'easingcss3': 'ease',
			'loopHorizontal': true,
			'touchSensitivity': 5,

			//Accessibility
			'keyboardScrolling': true,
			'recordHistory': true,

			//design
			'controlArrows': true,

			//Custom selectors
			'sectionSelector': '.section',
			'slideSelector': '.slide',


			//events
			'afterLoad': null,
			'onLeave': null,
			'afterRender': null,
			'afterResize': null,
			'afterReBuild': null,
			'afterSlideLoad': null,
			'onSlideLeave': null
		};

		options = extend(defaults, options);

		//easeInOutCubic animation included in the plugin
		Math.easeInOutCubic = function (t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t*t + b;return c/2*((t-=2)*t*t + 2) + b;
		};

		var slideMoving = false;
		var isTouchDevice = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|playbook|silk|BlackBerry|BB10|Windows Phone|Tizen|Bada|webOS|IEMobile|Opera Mini)/);
		var isTouch = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0) || (navigator.maxTouchPoints));
		var container = $(element);
		var windowsHeight = getWindowHeight();
		var isResizing = false;
		var lastScrolledDestiny;
		var lastScrolledSlide;
		var canScroll = true;
		var scrollings = [];
		var nav;
		var activeAnimation;
		var wrapperSelector = 'fullpage-wrapper';
		var originals = clone(options); //deep copy

		removeClass(container, 'fp-destroyed'); //in case it was destroyed before initilizing it again
		displayWarnings();
		init(afterDomReady);


		function init(callback){

			setMouseWheelScrolling(true);
			addTouchHandler();
			addResizeHandler();
			addScrollHandler();

			//if css3 is not supported, it will use jQuery animations
			if(options.css3){
				options.css3 = support3d();
			}

			if(container !== null){
				css(container, {
					'height': '100%',
					'position': 'relative'
				});

				//adding a class to recognize the container internally in the code
				addClass(container, wrapperSelector);
			}
			//trying to use fullpage without a selector?
			else{
				showError('error', 'Error! Fullpage.js needs to be initialized with a selector. For example: fullpage(\'#fullpage\');');
			}

			//adding internal class names to void problem with common ones
			var originalSections = $$(options.sectionSelector);
			for (i = 0; i < originalSections.length; ++i) {
				addClass(originalSections[i], 'fp-section');
			}

			var originalSlides = $$(options.slideSelector);
			for (i = 0; i < originalSlides.length; ++i) {
				addClass(originalSlides[i], 'fp-slide');
			}

			//creating the navigation dots
			if (options.navigation) {
				addVerticalNavigation();
			}


			var sections = $$('.fp-section');
			for(var i = 0; i<sections.length; i++){
				var index = i;
				var section = sections[i];
				var that = section;
				var slides = $$('.fp-slide', section);
				var numSlides = slides.length;

				//if no active section is defined, the 1st one will be the default one
				if(!index && $('.fp-section.active') === null) {
					addClass(section, 'active');
				}

				if (typeof options.anchors[index] !== 'undefined') {
					section.setAttribute('data-anchor', options.anchors[index]);

					//activating the menu / nav element on load
					if(hasClass(section, 'active')){
						activateMenuAndNav(options.anchors[index], index);
					}
				}

				// if there's any slide
				if (numSlides > 1) {
					var sliderWidth = numSlides * 100;
					var slideWidth = 100 / numSlides;

					var slidesHTML = section.innerHTML;
					var newHTML = '<div class="fp-slides"><div class="fp-slidesContainer">' + slidesHTML + '</div></div>';
					section.innerHTML = newHTML;

					//getting again the NEW dom elements after innerHTML
					slides = $$('.fp-slide', section);

					setCss($('.fp-slidesContainer', section), 'width',  sliderWidth + '%');

					if(options.controlArrows){
						createSlideArrows(section);
					}

					if(options.slidesNavigation){
						addSlidesNavigation(section, numSlides);
					}


					for(var a = 0; a<slides.length; a++){
						var currentSlide = slides[a];
						setCss(currentSlide, 'width', slideWidth + '%');
					}

					var startingSlide = $('.fp-slide.active', section);

					//if the slide won#t be an starting point, the default will be the first one
					if(typeof startingSlide !== null){
						addClass(slides[0], 'active');

					}

					//is there a starting point for a non-starting section?
					else{
						silentLandscapeScroll(startingSlide);
					}

				}
			}

			callback();
		}

		function afterDomReady(){
			setAutoScrolling(options.autoScrolling, 'internal');

			//the starting point is a slide?
			var activeSection = $('.fp-section.active');

			var activeSlide = $('.fp-slide.active', activeSection);
			var activeSectionIndex = getNodeIndex($('.fp-section.active'));

			//the active section isn't the first one? Is not the first slide of the first section? Then we load that section/slide by default.
			if( activeSlide &&  (activeSectionIndex !==0 || (activeSectionIndex === 0 &&  getNodeIndex(activeSlide) !== 0))){
				silentLandscapeScroll(activeSlide);
			}

			//vertical centered of the navigation + first bullet active
			if(options.navigation){
				setCss(nav, 'margin-top', '-' + (nav.offsetHeight/2) + 'px');
				var activeLi = $$('li', nav)[getNodeIndex($('.fp-section.active'))];
				addClass( $('a', activeLi), 'active');
			}

			isFunction( options.afterRender ) && options.afterRender.call(container);

			//getting the anchor link in the URL and deleting the `#`
			var value =  window.location.hash.replace('#', '').split('/');
			var destiny = value[0];

			if(destiny.length){
				var section = $('[data-anchor="'+destiny+'"]');

				if(!options.animateAnchor && section.length){

					if(options.autoScrolling){
						silentScroll(section.offsetTop);
					}
					else{
						silentScroll(0);
						setBodyClass(destiny);

						//scrolling the page to the section with no animation
						var scrollSettings = getScrollSettings(section.offsetTop);
						scrollTo(scrollSettings.element, scrollSettings.options, 0);
					}

					activateMenuAndNav(destiny, null);

					isFunction( options.afterLoad ) && options.afterLoad.call( section, destiny, (getNodeIndex(section) + 1));

					//updating the active class
					removeClass(activeSection, 'active');
					addClass(section, 'active');
				}
			}

			document.body.addEventListener('load', scrollToAnchor, false);
		}


		/* --------------- Javascript helpers  ---------------*/

		/**
		* Replacement of jQuery extend method.
		*/
		function extend(defaultOptions, options){
			//creating the object if it doesnt exist
			if(typeof(options) !== 'object'){
				options = {};
			}

			for(var key in options){
				if(defaultOptions.hasOwnProperty(key)){
					defaultOptions[key] = options[key];
				}
			}

			return defaultOptions;
		}

		function getById(element){
			return document.getElementById(element);
		}

		function getByTag(element){
			return document.getElementsByTagName(element)[0];
		}

		function getByTags(){
			return document.getElementsByTagName(element);
		}

		function css( el, props ) {
			var key;
			for ( key in props ) {
				if ( props.hasOwnProperty(key) ) {
					if ( key !== null ) {
						el.style[key] = props[key];
					}
				}
			}
			return el;
		}

		function setCss(element, style, value){
			element.style[style] = value;
		}

		function $(selector, context){
			context = context || document;
			return context.querySelector(selector);
		}

		function $$(selector, context){
			context = context || document;
			return context.querySelector(selector);
		}

		function getNodeIndex(node) {
			var index = 0;
			while ( (node = node.previousSibling) ) {
				if (node.nodeType != 3 || !/^\s*$/.test(node.data)) {
					index++;
				}
			}
			return index;
		}

		function toggle(element, display) {
			if(typeof display!== 'undefined'){
				if(display){
					element.style.display = 'block';
				}else{
					element.style.display = 'none';
				}
			}
			else{
				if( element.style.display == 'block' ) {
					element.style.display = 'none';
				} else {
					element.style.display = 'block';
				}
			}

			return element;
		}

		//http://jaketrent.com/post/addremove-classes-raw-javascript/
		function hasClass(ele,cls) {
			return !!ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
		}

		function removeClass(element, className) {
			if (element && hasClass(element,className)) {
				var reg = new RegExp('(\\s|^)'+className+'(\\s|$)');
				element.className=element.className.replace(reg,'');
			}
		}

		function addClass(element, className) {
			if (element && !hasClass(element,className)) {
				element.className += ' '+className;
			}
		}

		//http://stackoverflow.com/questions/22100853/dom-pure-javascript-solution-to-jquery-closest-implementation
		function closest(el, fn) {
			return el && (
				fn(el) ? el : closest(el.parentNode, fn)
			);
		}

		function getWindowHeight(){
			return  'innerHeight' in window ? window.innerHeight : document.documentElement.offsetHeight;
		}

		function clone(obj) {
			if (null === obj || 'object' !== typeof obj){
				return obj;
			}
			var copy = obj.constructor();

			for (var attr in obj) {
				if (obj.hasOwnProperty(attr)){
					copy[attr] = obj[attr];
				}
			}
			return copy;
		}

		function preventDefault(event){
			event.preventDefault ? event.preventDefault() : event.returnValue = false;
		}

		function isFunction(functionToCheck) {
			var getType = {};
			return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
		}

		function addListenerMulti(el, s, fn) {
			var evts = s.split(' ');
			for (var i=0, iLen=evts.length; i<iLen; i++) {
				if (document.addEventListener) {
					el.addEventListener(evts[i], fn, false);
				}else{
					el.attachEvent(evts[i], fn, false); //IE 6/7/8
				}
			}
		}

		/**
		* Simulates the animated scrollTop of jQuery. Used only when css3:false.
		* http://stackoverflow.com/a/16136789/1081396
		*/
		function scrollTo(element, to, duration, callback) {
			var start = getScrolledPosition(element);
			var change = to - start;
			var currentTime = 0;
			var increment = 20;
			activeAnimation = true;

			var animateScroll = function(){
				if(activeAnimation){ //in order to stope it from other function whenever we want
					currentTime += increment;
					var val = Math.easeInOutCubic(currentTime, start, change, duration);

					setScrolling(element, val);

					if(currentTime < duration) {
						setTimeout(animateScroll, increment);
					}else if(typeof callback !== 'undefined'){
						 callback();
					}
				}
			};
			animateScroll();
		}

		//http://stackoverflow.com/questions/3464876/javascript-get-window-x-y-position-for-scroll
		function getScrollTop(){
			var doc = document.documentElement;
			return (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
		}

		//http://stackoverflow.com/questions/4378784/how-to-find-all-siblings-of-currently-selected-object
		function getAllSiblings(elem, filter) {
			var sibs = [];
			elem = elem.parentNode.firstChild;
			do {
				if (!filter || filter(elem)) sibs.push(elem);
			} while (elem = elem.nextSibling);

			return sibs;
		}

		/* --------------- END Javascript helpers  ---------------*/


		/**
		* Getting the position of the element to scroll when using jQuery animations
		*/
		function getScrolledPosition(element){
			var position;
			if(hasClass(element, 'fp-slides')){
				position = element.scrollLeft;
			}
			else if(!options.autoScrolling  || options.scrollBar){
				position = getScrollTop();
			}
			else{
				position = element.offsetTop;
			}

			//gets the top property of the wrapper
			return position;
		}

		function setScrolling(element, val){
			if(!options.autoScrolling || options.scrollBar || hasClass(element, 'fp-slides')){

				//scrolling horizontally through the slides?
				if(hasClass(element, 'fp-slides')){
					element.scrollLeft = val;
				}
				//vertical scroll
				else{
					element.scrollTo(0, val);
				}
			}else{
				 element.style.top = val + 'px';
			}
		}

		function setAutoScrolling(value, type){
			setVariableState('autoScrolling', value, type);

			var element = $('.fp-section.active');

			if(options.autoScrolling && !options.scrollBar){

				css(document.body, {
					'overflow': 'hidden',
					'height': '100%'
				});

				css(getByTag('html'),{
					'overflow': 'hidden',
					'height': '100%'
				});

				setRecordHistory(options.recordHistory, 'internal');

				//for IE touch devices
				css(container, {
					'-ms-touch-action': 'none',
					'touch-action': 'none'
				});

				if(element){
					//moving the container up
					silentScroll(element.offsetTop);
				}

			}else{
				css(document.body, {
					'overflow': 'visible',
					'height': '100%'
				});

				css(getByTag('html'),{
					'overflow': 'visible',
					'height': '100%'
				});

				setRecordHistory(false, 'internal');

				//for IE touch devices
				css(container, {
					'-ms-touch-action': '',
					'touch-action': ''
				});

				silentScroll(0);

				//scrolling the page to the section with no animation
				var scrollSettings = getScrollSettings(element.offsetTop);
				scrollTo(scrollSettings.element, scrollSettings.options, 0);
			}

		}

		/**
		* Defines wheter to record the history for each hash change in the URL.
		*/
		function setRecordHistory(value, type){
			setVariableState('recordHistory', value, type);
		}

		/**
		* Defines the scrolling speed
		*/
		function setScrollingSpeed(value, type){
			setVariableState('scrollingSpeed', value, type);
		}

		/**
		* Sets fitToSection
		*/
		function setFitToSection(value, type){
			setVariableState('fitToSection', value, type);
		}

		/**
		* Adds or removes the possiblity of scrolling through sections by using the mouse wheel or the trackpad.
		*/
		function setMouseWheelScrolling(value){
			if(value){
				addMouseWheelHandler();
			}else{
				removeMouseWheelHandler();
			}
		}

		/**
		* Adds or removes the possiblity of scrolling through sections by using the keyboard arrow keys
		*/
		function setKeyboardScrolling(value){
			options.keyboardScrolling = value;
		}

		function next(element){
			var nextSibling = element.nextSibling;

			while(nextSibling && nextSibling.nodeType != 1) {
				nextSibling = nextSibling.nextSibling;
			}

			return nextSibling;
		}


		function prev(element){
			var prevSibling = element.previousSibling;

			while(prevSibling && prevSibling.nodeType != 1) {
				prevSibling = prevSibling.previousSibling;
			}

			return prevSibling;
		}

		function moveSectionUp(){
			var section = prev($('.fp-section.active'));

			if (section) {
				scrollPage(section, null, true);
			}
		}

		function moveSectionDown(){
			var section = next($('.fp-section.active'));

			if(section){
				scrollPage(section, null, false);
			}
		}

		function moveTo(section, slide){
			var destiny = '';

			if(isNaN(section)){
				destiny = $('[data-anchor="'+section+'"]');
			}else{
				destiny = $$('.fp-section')[section -1];
			}

			if (typeof slide !== 'undefined'){
				scrollPageAndSlide(section, slide);
			}else if(destiny.length > 0){
				scrollPage(destiny);
			}
		}

		function moveSlideRight(){
			moveSlide('next');
		}

		function moveSlideLeft(){
			moveSlide('prev');
		}


		/**
		 * When resizing is finished, we adjust the slides sizes and positions
		 */
		function reBuild(resizing){
			if(hasClass(container, 'fp-destroyed')){ return; }

			isResizing = true;

			windowsHeight = getWindowHeight();

			var sections = $$('.fp-section');
			for (var i = 0; i < sections.length; ++i) {
				var section = sections[i];
				var slidesWrap = $('.fp-slides', section);
				var slides = $$('.fp-slide', section);

				//adjusting the position fo the FULL WIDTH slides...
				if (slidesWrap && slides.length) {
					landscapeScroll(slidesWrap, $('.fp-slide.active', slidesWrap));
				}
			}


			var activeSection = $('.fp-section.active');

			//isn't it the first section?
			if(getNodeIndex(activeSection)){
				//adjusting the position for the current section
				silentScroll(activeSection.offsetTop);
			}

			isResizing = false;
			isFunction( options.afterResize ) && resizing && options.afterResize.call(container);
			isFunction( options.afterReBuild ) && !resizing && options.afterReBuild.call(container);
		}

		/**
		* Creates the control arrows for the given section
		*/
		function createSlideArrows(section){
			var prev = document.createElement('div');
			prev.className = 'fp-controlArrow fp-prev';

			var next = document.createElement('div');
			next.className = 'fp-controlArrow fp-next';

			var slides = $('.fp-slides', section);

			if(options.controlArrowColor != '#fff'){
				setCss(next, 'border-color', 'transparent transparent transparent '+options.controlArrowColor);
				setCss(prev, 'border-color', 'transparent '+ options.controlArrowColor + ' transparent transparent');
			}

			slides.appendChild(prev);
			slides.appendChild(next);

			if(!options.loopHorizontal){
				$('.fp-controlArrow.fp-prev', section).style.display = 'none';
			}
		}

		/**
		* Creates a vertical navigation bar.
		*/
		function addVerticalNavigation(){
			var div = document.createElement('div');
			div.setAttribute('id', 'fp-nav');

			var divUl = document.createElement('ul');
			div.appendChild(divUl);

			document.body.appendChild(div);

			nav = $('#fp-nav');

			setCss(nav, 'color', options.navigationColor);
			addClass(nav, options.navigationPosition);

			var li = '';

			for (var i = 0; i < $$('.fp-section').length; i++) {
				var link = '';
				if (options.anchors.length) {
					link = options.anchors[i];
				}

				li = li + '<li><a href="#' + link + '"><span></span></a>';

				// Only add tooltip if needed (defined by user)
				var tooltip = options.navigationTooltips[i];
				if (typeof tooltip !== undefined && tooltip !== '') {
					li += '<div class="fp-tooltip ' + options.navigationPosition + '">' + tooltip + '</div>';
				}

				li += '</li>';
			}

			var ul = $('ul', nav);
			ul.innerHTML = ul.innerHTML + li;

			//creating the event listener
			var links = $$('#fp-nav a');
			for(var l = 0; l<links.length; l++){
				addListenerMulti(links[l], 'click onclick touchstart', function(e){
					e = window.event || e || e.originalEvent;
					preventDefault(e);
					var index = getNodeIndex(this.parentNode);

					scrollPage($$('.fp-section')[index], null, false);
				});
			}

		}

		var scrollId;
		var scrollId2;
		var isScrolling = false;


		//when scrolling
		function scrollHandler(){
			var currentSection;

			if(!options.autoScrolling || options.scrollBar){
				var currentScroll = getScrollTop();
				var visibleSectionIndex = 0;
				var initial = Math.abs(currentScroll - $$('.fp-section')[0].offsetTop);

				//taking the section which is showing more content in the viewport
				var sections = $$('.fp-section');
				for (var i = 0; i < sections.length; ++i) {
					var section = sections[i];

					var current = Math.abs(currentScroll - section.offsetTop);

					if(current < initial){
						visibleSectionIndex = i;
						initial = current;
					}
				}

				//geting the last one, the current one on the screen
				currentSection = $$('.fp-section')[visibleSectionIndex];
			}

			if(!options.autoScrolling || options.scrollBar){
				//executing only once the first time we reach the section
				if(!hasClass(currentSection, 'active')){
					isScrolling = true;
					var leavingSection = $('.fp-section.active');
					var leavingSectionIndex = getNodeIndex(leavingSection) + 1;
					var yMovement = getYmovement(currentSection);
					var anchorLink  = currentSection.getAttribute('data-anchor');
					var sectionIndex = getNodeIndex(currentSection) + 1;
					var activeSlide = $('.fp-slide.active', currentSection);

					if(activeSlide){
						var slideAnchorLink = activeSlide.getAttribute('data-anchor');
						var slideIndex = getNodeIndex(activeSlide);
					}

					//removing siblings active class
					var prevActive = $('.fp-section.active');
					removeClass(prevActive, 'active');

					if(canScroll){
						//adding the active class to the current active section
						addClass(currentSection, 'active');

						isFunction( options.onLeave ) && options.onLeave.call( leavingSection, leavingSectionIndex, sectionIndex, yMovement);
						isFunction( options.afterLoad ) && options.afterLoad.call( currentSection, anchorLink, sectionIndex);

						activateMenuAndNav(anchorLink, 0);

						if(options.anchors.length){
							//needed to enter in hashChange event when using the menu with anchor links
							lastScrolledDestiny = anchorLink;

							setState(slideIndex, slideAnchorLink, anchorLink, sectionIndex);
						}
					}

					//small timeout in order to avoid entering in hashChange event when scrolling is not finished yet
					clearTimeout(scrollId);
					scrollId = setTimeout(function(){
						isScrolling = false;
					}, 100);
				}

				if(options.fitToSection){
					//for the auto adjust of the viewport to fit a whole section
					clearTimeout(scrollId2);

					scrollId2 = setTimeout(function(){
						if(canScroll){
							//allows to scroll to an active section and
							//if the section is already active, we prevent firing callbacks
							if(getNodeIndex($('.fp-section.active')) == getNodeIndex(currentSection) ){
								isResizing = true;
							}

							scrollPage(currentSection);
							isResizing = false;
						}
					}, 1000);
				}
			}
		}

		/**
		* Determines the way of scrolling up or down:
		* by 'automatically' scrolling a section or by using the default and normal scrolling.
		*/
		function scrolling(type){
			if(type == 'down'){
				moveSectionDown();
			}else{
				moveSectionUp();
			}
		}


		var touchStartY = 0;
		var touchStartX = 0;
		var touchEndY = 0;
		var touchEndX = 0;

		/* Detecting touch events

		* As we are changing the top property of the page on scrolling, we can not use the traditional way to detect it.
		* This way, the touchstart and the touch moves shows an small difference between them which is the
		* used one to determine the direction.
		*/
		function touchMoveHandler(event){
			var e = event.originalEvent;

			if(isReallyTouch(e)){
				if(options.autoScrolling){
					//preventing the easing on iOS devices
					preventDefault(event);
				}

				var activeSection = $('.fp-section.active');
				var slides = $$('.fp-slides', activeSection);

				if (canScroll && !slideMoving) { //if theres any #
					var touchEvents = getEventsPage(e);

					touchEndY = touchEvents.y;
					touchEndX = touchEvents.x;

					//if movement in the X axys is greater than in the Y and the currect section has slides...
					if ( slides && Math.abs(touchStartX - touchEndX) > (Math.abs(touchStartY - touchEndY))) {

						//is the movement greater than the minimum resistance to scroll?
						if (Math.abs(touchStartX - touchEndX) > (window.offsetWidth / 100 * options.touchSensitivity)) {
							if (touchStartX > touchEndX) {
								moveSlideRight(); //next
							} else {
								moveSlideLeft(); //prev
							}
						}
					}

					//vertical scrolling (only when autoScrolling is enabled)
					else if(options.autoScrolling){

						//is the movement greater than the minimum resistance to scroll?
						if (Math.abs(touchStartY - touchEndY) > (window.offsetHeight/ 100 * options.touchSensitivity)) {
							if (touchStartY > touchEndY) {
								scrolling('down');
							} else if (touchEndY > touchStartY) {
								scrolling('up');
							}
						}
					}
				}
			}
		}

		/**
		* As IE >= 10 fires both touch and mouse events when using a mouse in a touchscreen
		* this way we make sure that is really a touch event what IE is detecting.
		*/
		function isReallyTouch(e){
			//if is not IE   ||  IE is detecting `touch` or `pen`
			return typeof e.pointerType === 'undefined' || e.pointerType != 'mouse';
		}

		function touchStartHandler(event){
			var e = event.originalEvent;

			//stopping the auto scroll to adjust to a section
			if(options.fitToSection){
				activeAnimation = false;
			}

			if(isReallyTouch(e)){
				var touchEvents = getEventsPage(e);
				touchStartY = touchEvents.y;
				touchStartX = touchEvents.x;
			}
		}

		function getAverage(elements, number){
			var sum = 0;

			//taking `number` elements from the end to make the average, if there are not enought, 1
			var lastElements = elements.slice(Math.max(elements.length - number, 1));

			for(var i = 0; i < lastElements.length; i++){
				sum = sum + lastElements[i];
			}
			return Math.ceil(sum/number);
		}


		/**
		 * Detecting mousewheel scrolling
		 *
		 * http://blogs.sitepointstatic.com/examples/tech/mouse-wheel/index.html
		 * http://www.sitepoint.com/html5-javascript-mouse-wheel/
		 */
		var prevTime = new Date().getTime();

		function MouseWheelHandler(e) {
			var curTime = new Date().getTime();

			if(options.autoScrolling){
				// cross-browser wheel delta
				e = window.event || e || e.originalEvent;

				var value = e.wheelDelta || -e.deltaY || -e.detail;
				var delta = Math.max(-1, Math.min(1, value));

				//Limiting the array to 150 (lets not waist memory!)
				if(scrollings.length > 149){
					scrollings.shift();
				}

				//keeping record of the previous scrollings
				scrollings.push(Math.abs(value));

				//preventing to scroll the site on mouse wheel when scrollbar is present
				if(options.scrollBar){
					preventDefault(e);
				}

				var timeDiff = curTime-prevTime;
				prevTime = curTime;

				//haven't they scrolled in a while?
				//(enough to be consider a different scrolling action to scroll another section)
				if(timeDiff > 200){
					//emptying the array, we dont care about old scrollings for our averages
					scrollings = [];
				}

				if(canScroll){//if theres any #

					var averageEnd = getAverage(scrollings, 10);
					var averageMiddle = getAverage(scrollings, 70);
					var isAccelerating = averageEnd >= averageMiddle;

					if(isAccelerating){
						//scrolling down?
						if (delta < 0) {
							scrolling('down');

						//scrolling up?
						}else {
							scrolling('up');
						}
					}
				}

				return false;
			}

			if(options.fitToSection){
				//stopping the auto scroll to adjust to a section
				activeAnimation = false;
			}
		}

		function moveSlide(direction){
			var activeSection = $('.fp-section.active');
			var slides = $('.fp-slides', activeSection);

			// more than one slide needed and nothing should be sliding
			if (!slides|| slideMoving) {
				return;
			}

			var currentSlide = $('.fp-slide.active', slides);
			var destiny = null;
			if(direction === 'prev'){
				destiny = prev(currentSlide);
			}else{
				destiny = next(currentSlide);
			}

			//isn't there a next slide in the secuence?
			if(!destiny){
				//respect loopHorizontal settin
				if (!options.loopHorizontal) return;

				var siblings = getAllSiblings(currentSlide);
				if(direction === 'prev'){
					destiny = siblings[siblings.length - 1]; //last
				}else{
					destiny = siblings[0]; //first
				}
			}

			slideMoving = true;

			landscapeScroll(slides, destiny);
		}



		/**
		* Maintains the active slides in the viewport
		* (Because he `scroll` animation might get lost with some actions)
		*/
		function keepSlidesPosition(){
			var activeSlides = $$('.fp-slide.active');
			for( var i =0; i<activeSlides.length; i++){
				silentLandscapeScroll(activeSlides[i]);
			}
		}

		/**
		* Scrolls the site to the given element and scrolls to the slide if a callback is given.
		*/
		function scrollPage(element, callback, isMovementUp){
			if(element === null){ return; } //there's no element to scroll, leaving the function
			//local variables
			var v = {
				element: element,
				callback: callback,
				isMovementUp: isMovementUp,
				dtop: element.offsetTop,
				yMovement: getYmovement(element),
				anchorLink: element.getAttribute('data-anchor'),
				sectionIndex: getNodeIndex(element),
				activeSlide: $('.fp-slide.active', element),
				activeSection: $('.fp-section.active'),
				leavingSection: getNodeIndex($('.fp-section.active')) + 1,

				//caching the value of isResizing at the momment the function is called
				//because it will be checked later inside a setTimeout and the value might change
				localIsResizing: isResizing
			};

			//quiting when destination scroll is the same as the current one
			if(( getNodeIndex(v.activeSection) == v.sectionIndex && !isResizing) || (options.scrollBar && getScrollTop() === v.dtop)){ return; }

			if(v.activeSlide){
				var slideAnchorLink = v.activeSlide.getAttribute('data-anchor');
				var slideIndex = getNodeIndex(v.activeSlide);
			}

			var siblings = $$('.fp-section');
			for(var s=0; s<siblings.length; s++){
				removeClass(siblings[s], 'active');
			}

			addClass(element, 'active');

			//preventing from activating the MouseWheelHandler event
			//more than once if the page is scrolling
			canScroll = false;

			setState(slideIndex, slideAnchorLink, v.anchorLink, v.sectionIndex);

			//callback (onLeave) if the site is not just resizing and readjusting the slides
			isFunction(options.onLeave) && !v.localIsResizing && options.onLeave.call(v.activeSection, v.leavingSection, (v.sectionIndex + 1), v.yMovement);


			performMovement(v);

			//flag to avoid callingn `scrollPage()` twice in case of using anchor links
			lastScrolledDestiny = v.anchorLink;


			activateMenuAndNav(v.anchorLink, v.sectionIndex);
		}

		/**
		* Performs the movement (by CSS3 or by jQuery)
		*/
		function performMovement(v){
			// using CSS3 translate functionality
			if (options.css3 && options.autoScrolling && !options.scrollBar) {
				var translate3d = 'translate3d(0px, -' + v.dtop + 'px, 0px)';
				transformContainer(translate3d, true);

				setTimeout(function () {
					afterSectionLoads(v);
				}, options.scrollingSpeed);
			}

			// using jQuery animate
			else{
				var scrollSettings = getScrollSettings(v.dtop);
				scrollTo(scrollSettings.element, scrollSettings.options, options.scrollingSpeed, function(){
					afterSectionLoads(v);
				});

				/*
				$(scrollSettings.element).animate(
					scrollSettings.options
				, options.scrollingSpeed, options.easing).promise().done(function () { //only one single callback in case of animating  `html, body`
					afterSectionLoads(v);
				});
				*/
			}
		}

		/**
		* Gets the scrolling settings depending on the plugin autoScrolling option
		*/
		function getScrollSettings(top){
			var scroll = {};

			//top property animation
			if(options.autoScrolling && !options.scrollBar){
				scroll.options = -top;
				scroll.element = $('.'+wrapperSelector);
			}

			//window real scrolling
			else{
				scroll.options = top;
				scroll.element = window;
			}

			return scroll;
		}

		/**
		* Actions to do once the section is loaded
		*/
		function afterSectionLoads (v){
			//callback (afterLoad) if the site is not just resizing and readjusting the slides
			isFunction(options.afterLoad) && !v.localIsResizing && options.afterLoad.call(v.element, v.anchorLink, (v.sectionIndex + 1));
			canScroll = true;
			setTimeout(function () {
				isFunction(v.callback) && v.callback.call(this);
			}, 600);
		}


		/**
		* Scrolls to the anchor in the URL when loading the site
		*/
		function scrollToAnchor(){
			//getting the anchor link in the URL and deleting the `#`
			var value =  window.location.hash.replace('#', '').split('/');
			var section = value[0];
			var slide = value[1];

			if(section){  //if theres any #
				scrollPageAndSlide(section, slide);
			}
		}

	//	window.onhashchange = hashChangeHandler;

		//detecting any change on the URL to scroll to the given anchor link
		//(a way to detect back history button as we play with the hashes on the URL)
			if (document.addEventListener) {
				window.addEventListener('hashchange', hashChangeHandler, false); //IE9, Chrome, Safari, Oper
			} else {
				window.attachEvent('onhashchange', hashChangeHandler); //IE 6/7/8
			}

		function hashChangeHandler(){
			if(!isScrolling){
				var value =  window.location.hash.replace('#', '').split('/');
				var section = value[0];
				var slide = value[1];

				if(section.length){
					//when moving to a slide in the first section for the first time (first time to add an anchor to the URL)
					var isFirstSlideMove =  (typeof lastScrolledDestiny === 'undefined');
					var isFirstScrollMove = (typeof lastScrolledDestiny === 'undefined' && typeof slide === 'undefined' && !slideMoving);

					/*in order to call scrollpage() only once for each destination at a time
					It is called twice for each scroll otherwise, as in case of using anchorlinks `hashChange`
					event is fired on every scroll too.*/
					if ((section && section !== lastScrolledDestiny) && !isFirstSlideMove || isFirstScrollMove || (!slideMoving && lastScrolledSlide != slide ))  {
						scrollPageAndSlide(section, slide);
					}
				}
			}
		}


		/**
		 * Sliding with arrow keys, both, vertical and horizontal
		 */
		var keydownId;
		document.onkeydown = function(e) {
			clearTimeout(keydownId);

			var activeElement = document.activeElement;
			var tagName = activeElement.tagName;

			if(tagName !== 'SELECT' && tagName !== 'INPUT' && options.keyboardScrolling && options.autoScrolling){

				e = window.event || e || e.originalEvent;
				var charCode = e.charCode || e.keyCode;

				//preventing the scroll with arrow keys & spacebar & Page Up & Down keys
				var keyControls = [40, 38, 32, 33, 34];
				for(var i=0; i<keyControls.length; i++){
					if(keyControls[i] == charCode){
						preventDefault(e);
					}
				}

				keydownId = setTimeout(function(){
					onkeydown(e);
				},150);
			}
		}

		function onkeydown(e){
			var shiftPressed = e.shiftKey;

			switch (e.which) {
				//up
				case 38:
				case 33:
					moveSectionUp();
					break;

				//down
				case 32: //spacebar
					if(shiftPressed){
						moveSectionUp();
						break;
					}
				case 40:
				case 34:
					moveSectionDown();
					break;

				//Home
				case 36:
					moveTo(1);
					break;

				//End
				case 35:
					moveTo( $$('.fp-section').length );
					break;

				//left
				case 37:
					moveSlideLeft();
					break;

				//right
				case 39:
					moveSlideRight();
					break;

				default:
					return; // exit this handler for other keys
			}
		}

		/**
		* Scrolls the slider to the given slide destination for the given section
		*/
		var slidesNav = $('.fp-slidesNav a');
		if(slidesNav !== null){
			addListenerMulti($('.fp-slidesNav a'), 'click touchstart', function(e){
				preventDefault(e);

				//equivalent to:   var slides = $(this).closest('.fp-section').find('.fp-slides');
				var section = closest(this, function (el) {
					return hasClass(e1, 'fp-section');
				});
				var slides = $('.fp-slides', section);

				var li = closest(this, function (el) {
					return el.tagName === 'li';
				});
				var liIndex = getNodeIndex(li);
				var destiny = $$('.fp-slide', slides)[liIndex];

				landscapeScroll(slides, destiny);
			});
		}

		/**
		 * Scrolling horizontally when clicking on the slider controls.
		 */
		// $('.fp-section').on('click touchstart', '.fp-controlArrow', function() {
		// 	if ($(this).hasClass('fp-prev')) {
		// 		moveSlideLeft();
		// 	} else {
		// 		moveSlideRight();
		// 	}
		// });

		/**
		* Scrolls horizontal sliders.
		*/
		function landscapeScroll(slides, destiny){
			var slideIndex = getNodeIndex(destiny);

			//equivalent to slides.closest('.fp-section')
			var section = closest(slides, function(e1){
				return hasClass(e1, 'fp-section');
			});

			var sectionIndex = getNodeIndex(section);
			var anchorLink = section.getAttribute('data-anchor');
			var slidesNav = $('.fp-slidesNav', section);
			var slideAnchor = destiny.getAttribute('data-anchor');

			//caching the value of isResizing at the momment the function is called
			//because it will be checked later inside a setTimeout and the value might change
			var localIsResizing = isResizing;

			if(options.onSlideLeave){
				var prevSlide = $('.fp-slide.active', section);
				var prevSlideIndex = getNodeIndex(prevSlide);
				var xMovement = getXmovement(prevSlideIndex, slideIndex);

				//if the site is not just resizing and readjusting the slides
				if(!localIsResizing && xMovement!=='none'){
					isFunction( options.onSlideLeave ) && options.onSlideLeave.call( prevSlide, anchorLink, (sectionIndex + 1), prevSlideIndex, xMovement);
				}
			}

			var siblings = $$('.fp-slide', section);

			for(var s=0; s<siblings.length; s++){
				removeClass(siblings[s], 'active');
			}

			addClass(destiny, 'active');


			if(typeof slideAnchor === 'undefined'){
				slideAnchor = slideIndex;
			}

			if(!options.loopHorizontal && options.controlArrows){
				//hidding it for the fist slide, showing for the rest
				toggle($('.fp-controlArrow.fp-prev', section), slideIndex!==0);

				//hidding it for the last slide, showing for the rest
				toggle($('.fp-controlArrow.fp-next', section), !destiny.is(':last-child'));
			}

			//only changing the URL if the slides are in the current section (not for resize re-adjusting)
			if(hasClass(section, 'active')){
				setState(slideIndex, slideAnchor, anchorLink, sectionIndex);
			}

			var afterSlideLoads = function(){
				//if the site is not just resizing and readjusting the slides
				if(!localIsResizing){
					isFunction( options.afterSlideLoad ) && options.afterSlideLoad.call( destiny, anchorLink, (sectionIndex + 1), slideAnchor, slideIndex);
				}
				//letting them slide again
				slideMoving = false;
			};

			if(options.css3){
				var translate3d = 'translate3d(-' + destiny.offsetLeft + 'px, 0px, 0px)';
				var slidesContainer = $('.fp-slidesContainer', slides);

				addAnimation(slidesContainer, options.scrollingSpeed>0);
				setTransforms(slidesContainer, translate3d);

				setTimeout(function(){
					afterSlideLoads();
				}, options.scrollingSpeed, options.easing);
			}else{
				scrollTo(slides, destiny.offsetLeft, options.scrollingSpeed, function(){
					afterSlideLoads();
				});
			}

			if(options.slidesNavigation){
				removeClass($('.active', slidesNav), 'active');
				var activeNavLi = $$('li', slidesNav)[slideIndex];
				var activeLink = $('a', activeNavLi);
				addClass(activeLink, 'active');
			}
		}

		//when resizing the site, we adjust the heights of the sections
		var previousHeight = windowsHeight;
		var resizeId;
		function resizeHandler(){
			// rebuild immediately on touch devices
			if (isTouchDevice) {

				//if the keyboard is visible
				if (document.activeElement.getAttribute('type') !== 'text') {
					var currentHeight = getWindowHeight();

					//making sure the change in the viewport size is enough to force a rebuild. (20 % of the window to avoid problems when hidding scroll bars)
					if( Math.abs(currentHeight - previousHeight) > (20 * Math.max(previousHeight, currentHeight) / 100) ){
						reBuild(true);
						previousHeight = currentHeight;
					}
				}
			}else{
				//in order to call the functions only when the resize is finished
				//http://stackoverflow.com/questions/4298612/jquery-how-to-call-resize-event-only-once-its-finished-resizing
				clearTimeout(resizeId);

				resizeId = setTimeout(function(){
					reBuild(true);
				}, 500);
			}
		}

		/**
		* Adds transition animations for the given element
		*/
		function addAnimation(element){
			var transition = 'all ' + options.scrollingSpeed + 'ms ' + options.easingcss3;

			removeClass(element, 'fp-notransition');

			css(element,{
				'-webkit-transition': transition,
				'transition': transition
			});

			return element;
		}

		/**
		* Remove transition animations for the given element
		*/
		function removeAnimation(element){
			return addClass(element, 'fp-notransition');
		}

		/**
		 * Activating the website navigation dots according to the given slide name.
		 */
		function activateNavDots(name, sectionIndex){
			if(options.navigation){
				removeClass( $('.active', nav), 'active');

				if(name){
					addClass( $('a[href="#' + name + '"]', nav) , 'active');
				}else{
					var currentLi = $$('li', nav)[sectionIndex];
					addClass( $('a', currentLi), 'active');
				}
			}
		}

		/**
		 * Activating the website main menu elements according to the given slide name.
		 */
		function activateMenuElement(name){
			if(options.menu){
				var menu = $(options.menu);
				if(menu){
					removeClass($('.active', menu), 'active');
					addClass($('[data-menuanchor="'+name+'"]', menu), 'active');
				}
			}
		}

		function activateMenuAndNav(anchor, index){
			activateMenuElement(anchor);
			activateNavDots(anchor, index);
		}

		/**
		* Retuns `up` or `down` depending on the scrolling movement to reach its destination
		* from the current section.
		*/
		function getYmovement(destiny){
			var fromIndex = getNodeIndex($('.fp-section.active'));
			var toIndex = getNodeIndex(destiny);
			if( fromIndex == toIndex){
				return 'none';
			}
			if(fromIndex > toIndex){
				return 'up';
			}
			return 'down';
		}

		/**
		* Retuns `right` or `left` depending on the scrolling movement to reach its destination
		* from the current slide.
		*/
		function getXmovement(fromIndex, toIndex){
			if( fromIndex == toIndex){
				return 'none';
			}
			if(fromIndex > toIndex){
				return 'left';
			}
			return 'right';
		}

		/**
		* Adds a css3 transform property to the container class with or without animation depending on the animated param.
		*/
		function transformContainer(translate3d, animated){
			if(animated){
				addAnimation(container);
			}else{
				removeAnimation(container);
			}

			setTransforms(container, translate3d);

			//syncronously removing the class after the animation has been applied.
			setTimeout(function(){
				removeClass(container, 'fp-notransition');
			},10);
		}


		/**
		* Scrolls to the given section and slide
		*/
		function scrollPageAndSlide(destiny, slide){
			var section;

			if (typeof slide === 'undefined') {
				slide = 0;
			}

			if(isNaN(destiny)){
				section = $('[data-anchor="'+destiny+'"]');
			}else{
				section = $$('.fp-section')[0][(destiny -1)];
			}

			//we need to scroll to the section and then to the slide
			if (destiny !== lastScrolledDestiny && !hasClass(section, 'active')){
				scrollPage(section, function(){
					scrollSlider(section, slide);
				});
			}
			//if we were already in the section
			else{
				scrollSlider(section, slide);
			}
		}

		/**
		* Scrolls the slider to the given slide destination for the given section
		*/
		function scrollSlider(section, slide){
			if(typeof slide != 'undefined'){
				var slides = $$('.fp-slides', section);
				var destiny =  $('.fp-slide[data-anchor="'+slide+'"]', section);

				if(destiny ===  null){
					destiny = $$('.fp-slide', section)[slide];
				}

				if(destiny){
					landscapeScroll(slides, destiny);
				}
			}
		}

		/**
		* Creates a landscape navigation bar with dots for horizontal sliders.
		*/
		function addSlidesNavigation(section, numSlides){
			var div = document.createElement('div');
			div.className = 'fp-slidesNav';

			var divUl = document.createElement('ul');
			div.appendChild(divUl);

			section.appendChild(div);

			var nav = $('.fp-slidesNav', section);
			var ul =  $('ul', nav);

			//top or bottom
			addClass(nav, options.slidesNavPosition);

			var list = '';
			for(var i=0; i< numSlides; i++){
				list = list + '<li><a href="#"><span></span></a></li>';
			}

			ul.innerHTML = ul.innerHTML + list;

			//centering it
			setCss(nav, 'margin-left', '-' + (nav.offsetWidth()/2) + 'px');

			var firstLi = $$('li', nav)[0];
			addClass( $('a', firstLi), 'active');
		}


		/**
		* Sets the state of the website depending on the active section/slide.
		* It changes the URL hash when needed and updates the body class.
		*/
		function setState(slideIndex, slideAnchor, anchorLink, sectionIndex){
			var sectionHash = '';

			if(options.anchors.length){

				//isn't it the first slide?
				if(slideIndex){
					if(typeof anchorLink !== 'undefined'){
						sectionHash = anchorLink;
					}

					//slide without anchor link? We take the index instead.
					if(typeof slideAnchor === 'undefined'){
						slideAnchor = slideIndex;
					}

					lastScrolledSlide = slideAnchor;
					setUrlHash(sectionHash + '/' + slideAnchor);

				//first slide won't have slide anchor, just the section one
				}else if(typeof slideIndex !== 'undefined'){
					lastScrolledSlide = slideAnchor;
					setUrlHash(anchorLink);
				}

				//section without slides
				else{
					setUrlHash(anchorLink);
				}

				setBodyClass(location.hash);
			}
			else if(typeof slideIndex !== 'undefined'){
					setBodyClass(sectionIndex + '-' + slideIndex);
			}
			else{
				setBodyClass(String(sectionIndex));
			}
		}

		/**
		* Sets the URL hash.
		*/
		function setUrlHash(url){
			if(options.recordHistory){
				location.hash = url;
			}else{
				//Mobile Chrome doesn't work the normal way, so... lets use HTML5 for phones :)
				if(isTouchDevice || isTouch){
					history.replaceState(undefined, undefined, '#' + url);
				}else{
					var baseUrl = window.location.href.split('#')[0];
					window.location.replace( baseUrl + '#' + url );
				}
			}
		}

		/**
		* Sets a class for the body of the page depending on the active section / slide
		*/
		function setBodyClass(text){
			//changing slash for dash to make it a valid CSS style
			text = text.replace('/', '-').replace('#','');

			//removing previous anchor classes
			document.body.className = document.body.className.replace(/\b\s?fp-viewing-[^\s]+\b/g, '');

			//adding the current anchor
			addClass(document.body, 'fp-viewing-' + text);
		}

		/**
		* Checks for translate3d support
		* @return boolean
		* http://stackoverflow.com/questions/5661671/detecting-transform-translate3d-support
		*/
		function support3d() {
			var el = document.createElement('p'),
				has3d,
				transforms = {
					'webkitTransform':'-webkit-transform',
					'OTransform':'-o-transform',
					'msTransform':'-ms-transform',
					'MozTransform':'-moz-transform',
					'transform':'transform'
				};

			// Add it to the body to get the computed style.
			document.body.insertBefore(el, null);

			for (var t in transforms) {
				if (el.style[t] !== undefined) {
					el.style[t] = 'translate3d(1px,1px,1px)';
					has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
				}
			}

			document.body.removeChild(el);

			return (has3d !== undefined && has3d.length > 0 && has3d !== 'none');
		}



		/**
		* Removes the auto scrolling action fired by the mouse wheel and trackpad.
		* After this function is called, the mousewheel and trackpad movements won't scroll through sections.
		*/
		function removeMouseWheelHandler(){
			if (document.addEventListener) {
				document.removeEventListener('mousewheel', MouseWheelHandler, false); //IE9, Chrome, Safari, Oper
				document.removeEventListener('wheel', MouseWheelHandler, false); //Firefox
			} else {
				document.detachEvent('onmousewheel', MouseWheelHandler); //IE 6/7/8
			}
		}


		/**
		* Adds the auto scrolling action for the mouse wheel and trackpad.
		* After this function is called, the mousewheel and trackpad movements will scroll through sections
		*/
		function addMouseWheelHandler(){
			addHandler(document, MouseWheelHandler, 'mousewheel', 'onmousewheel', 'wheel');
		}

		function addResizeHandler(){
			addHandler(window, resizeHandler, 'resize', 'onresize');
		}

		function addScrollHandler(){
			addHandler(window, scrollHandler, 'scroll', 'onscroll', 'onscroll');
		}

		function addHandler(element, method, normal, oldIE, firefox){
			if(element.addEventListener){
				element.addEventListener(normal, method, false); //IE9, Chrome, Safari, Oper

				if(typeof firefox !== 'undefined'){
					element.addEventListener(firefox, method, false); //Firefox
				}
			}else{
				element.attachEvent(oldIE, method);  //IE 6/7/8
			}
		}


		/**
		* Adds the possibility to auto scroll through sections on touch devices.
		*/
		function addTouchHandler(){
			if(isTouchDevice || isTouch){
				//Microsoft pointers
				var MSPointer = getMSPointer();

				document.removeEventListener('touchstart ' + MSPointer.down);
				document.removeEventListener('touchmove ' + MSPointer.move);

				document.addEventListener('touchstart ' + MSPointer.down, touchStartHandler);
				document.addEventListener('touchmove ' + MSPointer.move, touchMoveHandler);
			}
		}

		/**
		* Removes the auto scrolling for touch devices.
		*/
		function removeTouchHandler(){
			if(isTouchDevice || isTouch){
				//Microsoft pointers
				var MSPointer = getMSPointer();

				document.removeEventListener('touchstart ' + MSPointer.down);
				document.removeEventListener('touchmove ' + MSPointer.move);
			}
		}


		/*
		* Returns and object with Microsoft pointers (for IE<11 and for IE >= 11)
		* http://msdn.microsoft.com/en-us/library/ie/dn304886(v=vs.85).aspx
		*/
		function getMSPointer(){
			var pointer;

			//IE >= 11 & rest of browsers
			if(window.PointerEvent){
				pointer = { down: 'pointerdown', move: 'pointermove'};
			}

			//IE < 11
			else{
				pointer = { down: 'MSPointerDown', move: 'MSPointerMove'};
			}

			return pointer;
		}
		/**
		* Gets the pageX and pageY properties depending on the browser.
		* https://github.com/alvarotrigo/fullPage.js/issues/194#issuecomment-34069854
		*/
		function getEventsPage(e){
			var events = [];

			events.y = (typeof e.pageY !== 'undefined' && (e.pageY || e.pageX) ? e.pageY : e.touches[0].pageY);
			events.x = (typeof e.pageX !== 'undefined' && (e.pageY || e.pageX) ? e.pageX : e.touches[0].pageX);

			return events;
		}

		function silentLandscapeScroll(activeSlide){
			setScrollingSpeed (0, 'internal');

			//equivalent to:   activeSlide.closest('.fp-slides')
			var slides = closest(activeSlide, function (el) {
				return hasClass(el, 'fp-slides');
			});

			landscapeScroll(slides, activeSlide);
			setScrollingSpeed(originals.scrollingSpeed, 'internal');
		}

		function silentScroll(top){
			if(options.scrollBar){
				var scrollSettings = getScrollSettings(top);
				setScrolling(scrollSettings.element, scrollSettings.options, 0);
			}
			else if (options.css3) {
				var translate3d = 'translate3d(0px, -' + top + 'px, 0px)';
				transformContainer(translate3d, false);
			}
			else {
				setCss(container, 'top', -top);
			}
		}

		function setTransforms(element, translate3d){
			css(element, {
				'-webkit-transform': translate3d,
				'-moz-transform': translate3d,
				'-ms-transform': translate3d,
				'transform': translate3d
			});
		}

		/*
		* Sets the state for a variable with multiple states (original, and temporal)
		* Some variables such as `autoScrolling` or `recordHistory` might change automatically its state when using `responsive` or `autoScrolling:false`.
		* This function is used to keep track of both states, the original and the temporal one.
		* If type is not 'internal', then we assume the user is globally changing the variable.
		*/
		function setVariableState(variable, value, type){
			options[variable] = value;
			if(type !== 'internal'){
				originals[variable] = value;
			}
		}

		/**
		* Displays warnings
		*/
		function displayWarnings(){
			//anchors can not have the same value as any element ID or NAME
			for(var i =0; i<options.anchors.length; i++){
				var name = options.anchors[i];
				var existId = getById('#' + name);
				if( existId || $$('[name="'+name+'"]').length ){
					showError('error', 'data-anchor tags can not have the same value as any `id` element on the site (or `name` element for IE).');
				}
			}
		}

		function showError(type, text){
			console && console[type] && console[type]('fullPage: ' + text);
		}
	};
})(window, document);