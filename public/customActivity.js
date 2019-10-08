define([
    'postmonger'
], function (
    Postmonger
) {
    'use strict';

    var connection = new Postmonger.Session();
    var authTokens = {};
    var payload = {};
    var schemaPayload = [];
    
    var lastStepEnabled = false;
    
    var steps = [ // initialize to the same value as what's set in config.json for consistency
        { "label": "Step 1", "key": "step1" },
        { "label": "Step 2", "key": "step2" },
        { "label": "Step 3", "key": "step3" },
        { "label": "Step 4", "key": "step4", "active": false }
    ];
    
    var currentStep = steps[0].key;
    
    $(window).ready(onRender);

    connection.on('ready', onReady);
    connection.on('initActivity', initialize);
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);
    connection.on('requestedSchema', onGetSchema);
    connection.on('requestedCulture', onGetCulture);
    connection.on('requestedInteractionDefaults', onGetInteractionDefaults);
    connection.on('updateActivity', onUpdateActivity);

    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);
    
    function onRender() {
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');

        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');
        
        connection.trigger('requestSchema');
        connection.trigger('requestCulture');
        connection.trigger('requestInteractionDefaults');

        // Disable the next button if a value isn't selected
        $('#select1').change(function() {
            var message = getMessage();
            connection.trigger('updateButton', { button: 'next', enabled: Boolean(message) });

            $('#message').html(message);
        });

        // Toggle step 4 active/inactive
        // If inactive, wizard hides it and skips over it during navigation
        $('#toggleLastStep').click(function() {
            lastStepEnabled = !lastStepEnabled; // toggle status
            steps[3].active = !steps[3].active; // toggle active

            connection.trigger('updateSteps', steps);
        });
        

        $('#payload').on('change',onPayloadChanged);
        $('#payload').on('keyup',onPayloadChanged);
        
    }
    

    function initialize (data) {
        console.log(data);
        if (data) {
            payload = data;
            
            $( '#initialPayload' ).text( JSON.stringify( data , null , 4 ) );
        }
        else {
            $( '#initialPayload' ).text( 'initActivity contained no data' );
        }
        
        var message;
        var hasInArguments = Boolean(
            payload['arguments'] &&
            payload['arguments'].execute &&
            payload['arguments'].execute.inArguments &&
            payload['arguments'].execute.inArguments.length > 0
        );

        var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

        $.each(inArguments, function(index, inArgument) {
            $.each(inArgument, function(key, val) {
                if (key === 'message') {
                    message = val;
                }
            });
        });

        // If there is no message selected, disable the next button
        if (!message) {
            showStep(null, 1);
            connection.trigger('updateButton', { button: 'next', enabled: false });
            // If there is a message, skip to the summary step
        } else {
            $('#select1').find('option[value='+ message +']').attr('selected', 'selected');
            $('#message').html(message);
            showStep(null, 3);
        }
    }
    
    function onUpdateActivity (data) {
        console.log('Postmonger - updateActivity', data);
    }
    
    function onGetTokens(tokens) {
        console.log(tokens);
        authTokens = tokens;
    }

    function onGetEndpoints(endpoints) {
        console.log(endpoints);
    }
    
    function onGetInteractionDefaults (interactionDefaults) {
        console.log('Postmonger - requestedInteractionDefaults', interactionDefaults);
        if(interactionDefaults){
            $( '#interactionDefaults').text( JSON.stringify( interactionDefaults, null, 4) );
        } else {
            $( '#interactionDefaults').text( 'There are currently no event defaults.');
        }
    }
    
    function onReady (data) {
        console.log('Postmonger - ready', data);
    }
    
    function onGetSchema (getSchemaPayload) {
        console.log('Postmonger - requestedSchema', getSchemaPayload);
        schemaPayload = getSchemaPayload;
        // Response: getSchemaPayload == { schema: [ ... ] };
        $( '#schema' ).text( JSON.stringify( getSchemaPayload , null , 4 ) );
    }
    
    function onGetCulture (culture) {
        console.log('Postmonger - requestedCulture', culture);
        // Response: culture == 'en-US'; culture == 'de-DE'; culture == 'fr'; etc.
        $( '#culture' ).text( JSON.stringify( culture , null , 4 ) );
    }
    
    function onClickedNext () {
        if (
            (currentStep.key === 'step3' && steps[3].active === false) ||
            currentStep.key === 'step4'
        ) {
            save();
        } else {
            connection.trigger('nextStep');
        }
    }

    function onClickedBack () {
        connection.trigger('prevStep');
    }

    function onGotoStep (step) {
        showStep(step);
        connection.trigger('ready');
    }

    function showStep(step, stepIndex) {
        if (stepIndex && !step) {
            step = steps[stepIndex-1];
        }

        currentStep = step;

        $('.step').hide();

        switch(currentStep.key) {
            case 'step1':
                $('#step1').show();
                connection.trigger('updateButton', {
                    button: 'next',
                    enabled: Boolean(getMessage())
                });
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: false
                });
                break;
            case 'step2':
                $('#step2').show();
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: true
                });
                connection.trigger('updateButton', {
                    button: 'next',
                    text: 'next',
                    visible: true
                });
                break;
            case 'step3':
                $('#step3').show();
                
                preparePayload();
                $('#payload').val(JSON.stringify(payload, null, 4));
                
                connection.trigger('updateButton', {
                     button: 'back',
                     visible: true
                });
                if (lastStepEnabled) {
                    connection.trigger('updateButton', {
                        button: 'next',
                        text: 'next',
                        visible: true
                    });
                } else {
                    connection.trigger('updateButton', {
                        button: 'next',
                        text: 'done',
                        visible: true
                    });
                }
                break;
            case 'step4':
                $('#step4').show();
                preparePayload();
                $('#payload').val(JSON.stringify(payload, null, 4));
                
                break;
        }
    }

   function onPayloadChanged() {
        console.log('Payload div - onPayloadChanged');
        if(currentStep && currentStep.key === 'step2') {
            try {
                payload = JSON.parse($('#payload').val());
                updateStep2NextButton(true);
            } catch( e ) {
                updateStep2NextButton(false);
            }
        }
    }
    
    function preparePayload() {
        //When loading the
        if (!schemaPayload.schema){
            connection.trigger('requestSchema');
        }

        // Payload is initialized on populateFields above.  Journey Builder sends an initial payload with defaults
        // set by this activity's config.json file.  Any property may be overridden as desired.

        //1.a) Configure inArguments from the interaction event
        var inArgumentsArray = [];
        var schemaInArgumentsArray = [];
        for (var i = 0; i < schemaPayload.schema.length; i++){
            var name = schemaPayload.schema[i].key.substr(schemaPayload.schema[i].key.lastIndexOf('.') + 1);
            var inArgument = {};
            inArgument[name] = '{{' + schemaPayload.schema[i].key + '}}'
            inArgumentsArray.push(inArgument);

            var schemaInArgument = {};
            schemaInArgument[name] = {};
            schemaInArgument[name].dataType = schemaPayload.schema[i].type;
            schemaInArgument[name].isNullable = schemaPayload.schema[i].isPrimaryKey ? false : (schemaPayload.schema[i].isNullable ? true : false);
            schemaInArgument[name].direction = 'in';
            schemaInArgumentsArray.push(schemaInArgument);
        }

        //1.b) Configure inArguments from the UI (end user manual config)
        var value = getMessage();
        inArgumentsArray.push({ 'message': value });
        schemaInArgumentsArray.push({ 'message': {'dataType': 'Text', 'isNullable':false, 'direction':'in'}});

        //1.c) Set all inArguments in the payload
        payload['arguments'].execute.inArguments = inArgumentsArray;
        payload['schema'].arguments.execute.inArguments = schemaInArgumentsArray;



        //2) Set other payload values
        var name = $('#select1').find('option:selected').html();
        var value = getMessage();
        payload.name = name;
        payload['metaData'].isConfigured = true;

        console.log('preparePayload', payload);
    }
    
    function save() {

        var postcardURLValue = $('#postcard-url').val();
        var postcardTextValue = $('#postcard-text').val();

        console.log('save', payload);
        connection.trigger('updateActivity', payload);
    }

    function getMessage() {
        return $('#select1').find('option:selected').attr('value').trim();
    }

});


