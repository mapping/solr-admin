/*
 Licensed to the Apache Software Foundation (ASF) under one or more
 contributor license agreements.  See the NOTICE file distributed with
 this work for additional information regarding copyright ownership.
 The ASF licenses this file to You under the Apache License, Version 2.0
 (the "License"); you may not use this file except in compliance with
 the License.  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// #/:core/replication
sammy.get
(
    /^#\/([\w\d-]+)\/(replication)$/,
    function( context )
    {
        var core_basepath = this.active_core.attr( 'data-basepath' );
        var content_element = $( '#content' );
        
        $.get
        (
            'tpl/replication.html',
            function( template )
            {
                content_element
                    .html( template );
                
                var replication_element = $( '#replication', content_element );
                var navigation_element = $( '#navigation', replication_element );

                function convert_seconds_to_readable_time( value )
                {
                    var text = [];
                    value = parseInt( value );

                    var minutes = Math.floor( value / 60 );
                    var hours = Math.floor( minutes / 60 );

                    if( 0 !== hours )
                    {
                        text.push( hours + 'h' );
                        value -= hours * 60 * 60;
                        minutes -= hours * 60;
                    }

                    if( 0 !== minutes )
                    {
                        text.push( minutes + 'm' );
                        value -= minutes * 60;
                    }

                    text.push( value + 's' );

                    return text.join( ' ' );
                }

                function replication_fetch_status()
                {
                    $.ajax
                    (
                        {
                            url : core_basepath + '/replication?command=details&wt=json',
                            dataType : 'json',
                            beforeSend : function( xhr, settings )
                            {
                                $( '.refresh-status', navigation_element )
                                    .addClass( 'loader' );
                            },
                            success : function( response, text_status, xhr )
                            {
                                $( '.refresh-status', navigation_element )
                                    .removeClass( 'loader' );
                                
                                var data = response.details;
                                var is_slave = 'true' === data.isSlave;

                                replication_element
                                    .addClass( is_slave ? 'slave' : 'master' );

                                if( is_slave )
                                {
                                    var error_element = $( '#error', replication_element );

                                    if( data.slave.ERROR )
                                    {
                                        error_element
                                            .html( data.slave.ERROR )
                                            .show();
                                    }
                                    else
                                    {
                                        error_element
                                            .hide()
                                            .empty();
                                    }

                                    var progress_element = $( '#progress', replication_element );

                                    var start_element = $( '#start', progress_element );
                                    $( 'span', start_element )
                                        .text( data.slave.replicationStartTime );

                                    var eta_element = $( '#eta', progress_element );
                                    $( 'span', eta_element )
                                        .text( convert_seconds_to_readable_time( data.slave.timeRemaining ) );

                                    var bar_element = $( '#bar', progress_element );
                                    $( '.files span', bar_element )
                                        .text( data.slave.numFilesToDownload );
                                    $( '.size span', bar_element )
                                        .text( data.slave.bytesToDownload );

                                    var speed_element = $( '#speed', progress_element );
                                    $( 'span', speed_element )
                                        .text( data.slave.downloadSpeed );

                                    var done_element = $( '#done', progress_element );
                                    $( '.files span', done_element )
                                        .text( data.slave.numFilesDownloaded );
                                    $( '.size span', done_element )
                                        .text( data.slave.bytesDownloaded );
                                    $( '.percent span', done_element )
                                        .text( parseInt(data.slave.totalPercent ) );

                                    var percent = parseInt( data.slave.totalPercent );
                                    if( 0 === percent )
                                    {
                                        done_element
                                            .css( 'width', '1px' ); 
                                    }
                                    else
                                    {
                                        done_element
                                            .css( 'width', percent + '%' );
                                    }

                                    var current_file_element = $( '#current-file', replication_element );
                                    $( '.file', current_file_element )
                                        .text( data.slave.currentFile );
                                    $( '.done', current_file_element )
                                        .text( data.slave.currentFileSizeDownloaded );
                                    $( '.total', current_file_element )
                                        .text( data.slave.currentFileSize );
                                    $( '.percent', current_file_element )
                                        .text( parseInt( data.slave.currentFileSizePercent ) );

                                    if( !data.slave.indexReplicatedAtList )
                                    {
                                        data.slave.indexReplicatedAtList = [];
                                    }

                                    if( !data.slave.replicationFailedAtList )
                                    {
                                        data.slave.replicationFailedAtList = [];
                                    }

                                    var iterations_element = $( '#iterations', replication_element );
                                    var iterations_list = $( '.iterations ul', iterations_element );

                                    var iterations_data = [];
                                    $.merge( iterations_data, data.slave.indexReplicatedAtList );
                                    $.merge( iterations_data, data.slave.replicationFailedAtList );
                                    iterations_data = $.unique( iterations_data ).reverse();

                                    if( 0 !== iterations_data.length )
                                    {
                                        var iterations = [];
                                        for( var i = 0; i < iterations_data.length; i++ )
                                        {
                                            iterations.push
                                            (
                                                '<li data-date="' + iterations_data[i] + '">' +
                                                iterations_data[i] + '</li>'
                                            );
                                        }
                                        
                                        iterations_list
                                            .html( iterations.join( "\n" ) )
                                            .show();
                                        
                                        $( data.slave.indexReplicatedAtList )
                                            .each
                                            (
                                                function( key, value )
                                                {
                                                    $( 'li[data-date="' + value + '"]', iterations_list )
                                                        .addClass( 'replicated' );
                                                }
                                            );
                                        
                                        if( data.slave.indexReplicatedAt )
                                        {
                                            $(
                                                'li[data-date="' + data.slave.indexReplicatedAt + '"]',
                                                iterations_list
                                            )
                                                .addClass( 'latest' );
                                        }
                                        
                                        $( data.slave.replicationFailedAtList )
                                            .each
                                            (
                                                function( key, value )
                                                {
                                                    $( 'li[data-date="' + value + '"]', iterations_list )
                                                        .addClass( 'failed' );
                                                }
                                            );
                                        
                                        if( data.slave.replicationFailedAt )
                                        {
                                            $(
                                                'li[data-date="' + data.slave.replicationFailedAt + '"]',
                                                iterations_list
                                            )
                                                .addClass( 'latest' );
                                        }

                                        if( 0 !== $( 'li:hidden', iterations_list ).size() )
                                        {
                                            $( 'a', iterations_element )
                                                .show();
                                        }
                                        else
                                        {
                                            $( 'a', iterations_element )
                                                .hide();
                                        }
                                    }
                                }

                                var details_element = $( '#details', replication_element );
                                var current_type_element = $( ( is_slave ? '.slave' : '.master' ), details_element );

                                $( '.version div', current_type_element )
                                    .html( data.indexVersion );
                                $( '.generation div', current_type_element )
                                    .html( data.generation );
                                $( '.size div', current_type_element )
                                    .html( data.indexSize );
                                
                                if( is_slave )
                                {
                                    var master_element = $( '.master', details_element );
                                    $( '.version div', master_element )
                                        .html( data.slave.masterDetails.indexVersion );
                                    $( '.generation div', master_element )
                                        .html( data.slave.masterDetails.generation );
                                    $( '.size div', master_element )
                                        .html( data.slave.masterDetails.indexSize );
                                    
                                    if( data.indexVersion !== data.slave.masterDetails.indexVersion )
                                    {
                                        $( '.version', details_element )
                                            .addClass( 'diff' );
                                    }
                                    else
                                    {
                                        $( '.version', details_element )
                                            .removeClass( 'diff' );
                                    }
                                    
                                    if( data.generation !== data.slave.masterDetails.generation )
                                    {
                                        $( '.generation', details_element )
                                            .addClass( 'diff' );
                                    }
                                    else
                                    {
                                        $( '.generation', details_element )
                                            .removeClass( 'diff' );
                                    }
                                }

                                if( is_slave )
                                {
                                    var settings_element = $( '#settings', replication_element );

                                    if( data.slave.masterUrl )
                                    {
                                        $( '.masterUrl dd', settings_element )
                                            .html( response.details.slave.masterUrl )
                                            .parents( 'li' ).show();
                                    }

                                    var polling_content = '&nbsp;';
                                    var polling_ico = 'ico-1';

                                    if( 'true' === data.slave.isPollingDisabled )
                                    {
                                        polling_ico = 'ico-0';

                                        $( '.disable-polling', navigation_element ).hide();
                                        $( '.enable-polling', navigation_element ).show();
                                    }
                                    else
                                    {
                                        $( '.disable-polling', navigation_element ).show();
                                        $( '.enable-polling', navigation_element ).hide();

                                        if( data.slave.pollInterval )
                                        {
                                            polling_content = '(interval: ' + data.slave.pollInterval + ')';
                                        }
                                    }

                                    $( '.isPollingDisabled dd', settings_element )
                                        .removeClass( 'ico-0' )
                                        .removeClass( 'ico-1' )
                                        .addClass( polling_ico )
                                        .html( polling_content )
                                        .parents( 'li' ).show();
                                }

                                var master_settings_element = $( '#master-settings', replication_element );

                                var master_data = is_slave
                                                         ? data.slave.masterDetails.master
                                                         : data.master;

                                var replication_icon = 'ico-0';
                                if( 'true' === master_data.replicationEnabled )
                                {
                                    replication_icon = 'ico-1';

                                    $( '.disable-replication', navigation_element ).show();
                                    $( '.enable-replication', navigation_element ).hide();
                                }
                                else
                                {
                                    $( '.disable-replication', navigation_element ).hide();
                                    $( '.enable-replication', navigation_element ).show();
                                }

                                $( '.replicationEnabled dd', master_settings_element )
                                    .removeClass( 'ico-0' )
                                    .removeClass( 'ico-1' )
                                    .addClass( replication_icon )
                                    .parents( 'li' ).show();

                                $( '.replicateAfter dd', master_settings_element )
                                    .html( master_data.replicateAfter.join( ', ' ) )
                                    .parents( 'li' ).show();

                                if( master_data.confFiles )
                                {
                                    var conf_files = [];
                                    var conf_data = master_data.confFiles.split( ',' );
                                    
                                    for( var i = 0; i < conf_data.length; i++ )
                                    {
                                        var item = conf_data[i];

                                        if( - 1 !== item.indexOf( ':' ) )
                                        {
                                            info = item.split( ':' );
                                            item = '<abbr title="' + info[0] + ' » ' + info[1] + '">'
                                                 + ( is_slave ? info[1] : info[0] )
                                                 + '</abbr>';
                                        }

                                        conf_files.push( item );
                                    }

                                    $( '.confFiles dd', master_settings_element )
                                        .html( conf_files.join( ', ' ) )
                                        .parents( 'li' ).show();
                                }


                                $( '.block', replication_element ).last()
                                    .addClass( 'last' );
                                



                                if( data.slave && 'true' === data.slave.isReplicating )
                                {
                                    replication_element
                                        .addClass( 'replicating' );
                                    
                                    $( '.replicate-now', navigation_element ).hide();
                                    $( '.abort-replication', navigation_element ).show();
                                    
                                    window.setTimeout( replication_fetch_status, 1000 );
                                }
                                else
                                {
                                    replication_element
                                        .removeClass( 'replicating' );
                                    
                                    $( '.replicate-now', navigation_element ).show();
                                    $( '.abort-replication', navigation_element ).hide();
                                }
                            },
                            error : function( xhr, text_status, error_thrown )
                            {
                                $( '#content' )
                                    .html( 'sorry, no replication-handler defined!' );
                            },
                            complete : function( xhr, text_status )
                            {
                            }
                        }
                    );
                }
                replication_fetch_status();

                $( '#iterations a', content_element )
                    .die( 'click' )
                    .live
                    (
                        'click',
                        function( event )
                        {
                            $( this ).parents( '.iterations' )
                                .toggleClass( 'expanded' );
                            
                            return false;
                        }
                    );

                $( 'button', navigation_element )
                    .die( 'click' )
                    .live
                    (
                        'click',
                        function( event )
                        {
                            var button = $( this );
                            var command = button.data( 'command' );

                            if( button.hasClass( 'refresh-status' ) && !button.hasClass( 'loader' ) )
                            {
                                replication_fetch_status();
                            }
                            else if( command )
                            {
                                $.get
                                (
                                    core_basepath + '/replication?command=' + command + '&wt=json',
                                    function()
                                    {
                                        replication_fetch_status();
                                    }
                                );
                            }
                            return false;
                        }
                    );
            }
        );
    }
);