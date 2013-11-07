"use strict";

var SeLiteSettings= {};
Components.utils.import("chrome://selite-settings/content/SeLiteSettings.js", SeLiteSettings);

var mainDb= new SeLiteSettings.Field.SQLite('mainDb');
var oneFolder= new SeLiteSettings.Field.Folder( 'oneFolder' );
var files= new SeLiteSettings.Field.File( 'files', false, false, true, [] );
var folders= new SeLiteSettings.Field.Folder( 'folders', false, false, true, [] );
var bool= new SeLiteSettings.Field.Bool('aBooleanField', false, true);
var appWebroot= new SeLiteSettings.Field.String('appWebroot', false, 'http://localhost/app');
var maxNumberOfRuns= new SeLiteSettings.Field.Int('maxNumberOfRuns', false, 20);
var multiNumbers= new SeLiteSettings.Field.Int('multiNumbers', true, [] );

var module= new SeLiteSettings.Module( 'extensions.selite-settings.test',
    [mainDb, oneFolder, files, folders, bool, appWebroot, maxNumberOfRuns, multiNumbers],
    true,
    'mainSet',
    false,
    '~/selite/settings/test_settings_module.js'
    //@TODO If the file doesn't exist, make it report an error.
    //'file:///home/pkehl/selite/settings/test_settings_module.js'
);

module= SeLiteSettings.register( module );
module.createSet( 'alternativeSet');

 // Testing that SeLiteSettings.register() checks/compares modules properly:
/*mainDb= new SeLiteSettings.Field.File('mainDb', true, { 'SQLite': '.sqlite'});
module= new SeLiteSettings.Module( 'extensions.selite-settings.test.',
    [mainDb],
    true,
    'mainSet.'
);

module= SeLiteSettings.register( module );
/**/

var mainDb2= new SeLiteSettings.Field.SQLite('mainDb2');
var bool2= new SeLiteSettings.Field.Bool('aBooleanField2', false, true);
var appWebroot2= new SeLiteSettings.Field.String('appWebroot2', false, 'http://localhost/app');
var maxNumberOfRuns2= new SeLiteSettings.Field.Int('maxNumberOfRuns2', false, 20);
var multiNumbers= new SeLiteSettings.Field.Int('multiNumbers', true, []);
var multiStrings= new SeLiteSettings.Field.String('multiStrings', true, []);
var choiceNumbers= new SeLiteSettings.Field.Choice.Int('choiceNumbers', true, [], {1:1, 5:5, 10:10, 20:20} );
var choiceStrings= new SeLiteSettings.Field.Choice.String('choiceStrings', true, [], {1:"one", 2:"two", 4:"four", 8:"eight"} );

var choiceNumbersSingle= new SeLiteSettings.Field.Choice.Int('choiceNumbersSingle', false, 1, {1:1, 5:5, 10:10, 20:20} );
var choiceStringsSingle= new SeLiteSettings.Field.Choice.String('choiceStringsSingle', false, '4', {1:"one", 2:"two", 4:"four", 8:"eight"} );

var module2= new SeLiteSettings.Module( 'extensions.selite-settings.test2',
    [mainDb2, bool2, appWebroot2, maxNumberOfRuns2, multiNumbers, multiStrings,
        choiceNumbers,  choiceStrings/**/,
        choiceNumbersSingle, choiceStringsSingle
    ],
    false,
    null,
    false,
    '~/selite/settings/test_settings_module.js'
);
module2= SeLiteSettings.register( module2 );
//-----------

var mainDb= new SeLiteSettings.Field.SQLite('mainDb');
var oneFolder= new SeLiteSettings.Field.Folder( 'oneFolder' );
var files= new SeLiteSettings.Field.File( 'files', false, false, true, [] );
var folders= new SeLiteSettings.Field.Folder( 'folders', false, false, true, [] );
var bool= new SeLiteSettings.Field.Bool('bool', false, true);
var appWebroot= new SeLiteSettings.Field.String('appWebroot', false, 'http://localhost/app');
var maxNumberOfRuns= new SeLiteSettings.Field.Int('maxNumberOfRuns', false, 20);
var multiNumbers= new SeLiteSettings.Field.Int('multiNumbers', true, []);
var multiStrings= new SeLiteSettings.Field.String('multiStrings', true, [] );
var choiceNumbers= new SeLiteSettings.Field.Choice.Int('choiceNumbers', true, [], {1:1, 5:5, 10:10, 20:20} );
var choiceStrings= new SeLiteSettings.Field.Choice.String('choiceStrings', true, [], {1:"one", 2:"two", 4:"four", 8:"eight"} );
var choiceNumbersSingle= new SeLiteSettings.Field.Choice.Int('choiceNumbersSingle', false, 1, {1:1, 5:5, 10:10, 20:20} );
var choiceStringsSingle= new SeLiteSettings.Field.Choice.String('choiceStringsSingle', false, '4', {1:"one", 2:"two", 4:"four", 8:"eight"} );

var module= new SeLiteSettings.Module( 'extensions.selite-settings.withFolders',
    [mainDb, oneFolder, files, folders, bool, appWebroot, maxNumberOfRuns, multiNumbers,
     multiStrings, choiceNumbers, choiceNumbersSingle, choiceStrings, choiceStringsSingle],
    true,
    'globalSet',
    true, //associatesWithFolders
    '~/selite/settings/test_settings_module.js'
    //'file:///home/pkehl/selite/settings/test_settings_module.js'
    );
module= SeLiteSettings.register( module );

//-----------

var mainDb= new SeLiteSettings.Field.SQLite('mainDb');
var oneFolder= new SeLiteSettings.Field.Folder( 'oneFolder' );
var files= new SeLiteSettings.Field.File( 'files', false, false, true, []);
var folders= new SeLiteSettings.Field.Folder( 'folders', false, false, true, [] );
var bool= new SeLiteSettings.Field.Bool('bool', false, true);
var appWebroot= new SeLiteSettings.Field.String('appWebroot', false, 'http://localhost/app');
var maxNumberOfRuns= new SeLiteSettings.Field.Int('maxNumberOfRuns', false, 20);
var multiNumbers= new SeLiteSettings.Field.Int('multiNumbers', true, []);
var multiStrings= new SeLiteSettings.Field.String('multiStrings', true, [] );
var choiceNumbers= new SeLiteSettings.Field.Choice.Int('choiceNumbers', true, [], {1:1, 5:5, 10:10, 20:20} );
var choiceStrings= new SeLiteSettings.Field.Choice.String('choiceStrings', true, [], {1:"one", 2:"two", 4:"four", 8:"eight"} );
var choiceNumbersSingle= new SeLiteSettings.Field.Choice.Int('choiceNumbersSingle', false, 1, {1:1, 5:5, 10:10, 20:20} );
var choiceStringsSingle= new SeLiteSettings.Field.Choice.String('choiceStringsSingle', false, '4', {1:"one", 2:"two", 4:"four", 8:"eight"} );

var module= new SeLiteSettings.Module( 'extensions.selite-settings.withFolders2',
    [mainDb, oneFolder, files, folders, bool, appWebroot, maxNumberOfRuns, multiNumbers,
     multiStrings, choiceNumbers, choiceNumbersSingle, choiceStrings, choiceStringsSingle],
    true,
    'globalSet',
    true, //associatesWithFolders
    '~/selite/settings/test_settings_module.js'
    );
module= SeLiteSettings.register( module );
