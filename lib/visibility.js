/**
 * Copyright 2014 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   './patches'
], function( ax ) {
   'use strict';

   /**
    * Creates a new handler instance for `didChangeAreaVisibility` events.
    *
    * @param {Object} scope
    *    the scope the handler should work with. It is expected to find an `eventBus` property there with
    *    which it can do the event handling. The visibility handler will manage the boolean scope property
    *    `isVisible` which can be used to determine the visibility state of the entire widget.
    * @param {Object=} optionalOptions
    *    additional options to pass to the visibility handler
    * @param {Function=} optionalOptions.onChange
    *    a handler to call when a `didChangeAreaVisibility` request for this widget's container was received,
    *    which means that the visibility of this widget was changed
    * @param {Function=} optionalOptions.onAnyAreaRequest
    *    a handler for any `changeAreaVisibilityRequest` to this widget's areas
    *    The handler must issue a will/did-response for the area when called!
    *
    * @returns {VisibilityHandler} not `null`
    */
   function handlerFor( scope, optionalOptions ) {
      return new VisibilityHandler( scope, optionalOptions );

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function VisibilityHandler( scope, optionalOptions ) {
      this.scope_ = scope;

      var options = ax.object.options( optionalOptions, {} );
      if( options.onChange ) {
         var didEvent = [ 'didChangeAreaVisibility', scope.widget.area ].join( '.' );
         scope.eventBus.subscribe( didEvent, options.onChange );
      }
      if( options.onAnyAreaRequest ) {
         var requestEvent = [ 'changeAreaVisibilityRequest', scope.widget.id ].join( '.' );
         scope.eventBus.subscribe( requestEvent, options.onAnyAreaRequest );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   VisibilityHandler.prototype = {
      /**
       * @param {String} areaName
       *    the name of the area for which to handle visibility events
       * @param {Object=} optionalOptions
       *    additional options to pass to the visibility handler
       * @param {Function=} optionalOptions.onChange
       *    a handler to call when a `didChangeAreaVisibility` request for the given area was received,
       *    which means that the visibility of the area was changed
       * @param {Function=} optionalOptions.onRequest
       *    a handler for any `changeAreaVisibilityRequest` to this area
       *    The handler must issue a will/did-response for the area when called!
       *    This should not be used in conjunction with the global `onAnyAreaRequest`-option of the handler.
       *
       * @return {VisibilityHandler}
       *    this visibility handler (for chaining)
       */
      registerArea: function( areaName, optionalOptions ) {
         var options = ax.object.options( optionalOptions, {} );
         if( options.onChange ) {
            var didEvent = [ 'didChangeAreaVisibility', areaName ].join( '.' );
            this.scope_.eventBus.subscribe( didEvent, options.onChange );
         }
         if( options.onAnyAreaRequest ) {
            var requestEvent = [ 'changeAreaVisibilityRequest', areaName ].join( '.' );
            this.scope_ .eventBus.subscribe( requestEvent, options.onAnyAreaRequest );
         }
      }
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Publishes `changeWidgetVisibilityRequest` events.
    *
    * @param {Object} scope
    *    a scope (with `widget` and `eventBus` properties)
    * @return {Function}
    *    a function of boolean that requests for widget visibility to be set to the given state
    */
   function publisherForWidget( scope ) {
      return function publish( visible ) {
         var eventName = [ 'changeWidgetVisibilityRequest', scope.widget.id, visible ].join( '.' );
         return scope.eventBus.publish( eventName, {
            widget: scope.widget.id,
            visible: visible
         }, { deliverToSender: false } );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Publishes `changeAreaVisibilityRequest` events.
    *
    * @param {Object} scope
    *    a scope (with an `eventBus` property)
    * @param {String} area
    *    the name of a widget area whose visibility is to be controlled by the function returned
    *
    * @return {Function}
    *    a function of boolean that requests for the given area's visibility to be set to the given state
    */
   function publisherForArea( scope, area ) {
      return function publish( visible ) {
         return scope.eventBus.publish( [ 'changeAreaVisibilityRequest', area, visible ].join( '.' ), {
            area: area,
            visible: visible
         }, { deliverToSender: false } );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      handlerFor: handlerFor,
      publisherForWidget: publisherForWidget,
      publisherForArea: publisherForArea
   };

} );