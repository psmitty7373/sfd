var f = function(e)
{
    var srcElement = e.srcElement? e.srcElement : e.target;
    if ($.inArray('Files', e.dataTransfer.types) > -1)
    {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = ($(srcElement).hasClass('droppable')) ? 'copy' : 'none';
        if (e.type == 'drop') {
            var formData = new FormData();
            formData.append('dir', srcElement.id);
            $.each(e.dataTransfer.files, function(i, file) {
                formData.append('file',file);
            });
            $.ajax({
                url: '/upload',
                type: 'POST',
                data: formData,
                dataType: 'json',
                cache: false,
                contentType: false,
                processData: false,
                success: function() {
                    $('#files').jstree('refresh');
                },
                error: function() {
                    console.log('upload error');
                }
            });
        }
    }
};

$(document).ready(function() {
    document.body.addEventListener('dragleave', f, false);
    document.body.addEventListener('dragover', f, false);
    document.body.addEventListener('drop', f, false);
    $('#files')
        .on('select_node.jstree', function(e, data) {
            if (data.node.li_attr.isLeaf) {
                var o = 'download/' + data.selected[0];
                var dl = $('<iframe />').attr('src', o).hide().appendTo('body');
            }
        }).jstree({
            'core': {
                'check_callback': true,
                'data': {
                    'method': 'POST',
                    'url': function(node) {
                        return 'dir/';
                    },
                    'data': function(node) {
                        return {
                            id: node.id
                        };
                    }
                }
            },
            'plugins': ['dnd', 'wholerow', 'contextmenu'],
            'contextmenu': {
                'select_node' : false,
                'items': function(node) {
                    return {
                        'mkdir': {
                            'separator_before': false,
                            'separator_after': false,
                            'label': 'mkdir',
                            'action': function (obj) {
                                var _node = node;
                                bootbox.prompt('Directory name?', function(name) {
                                    $.ajax({
                                        url: 'mkdir',
                                        type: 'POST',
                                        data: {'id': _node.id, 'name': name},
                                        success: function() {
                                            $('#files').jstree('refresh');
                                        },
                                        error: function() {
                                            console.log('mkdir error');
                                        }
                                    });
                                });
                            }
                        },
                        'del': {
                            'separator_before': false,
                            'separator_after': false,
                            'label': 'del',
                            'action': function (obj) {
                                $.ajax({
                                    url: 'delete',
                                    type: 'POST',
                                    data: {'id': node.id},
                                    success: function() {
                                        $('#files').jstree('refresh');
                                    },
                                    error: function() {
                                        console.log('delete error');
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });
    $(document).on('dnd_stop.vakata', function(e, data) {
        var t = $(data.event.target);
        var targetnode = t.closest('.jstree-node');
        var dst = targetnode.attr("id");
        var src = data.data.nodes[0];
        $.ajax({
            url: 'mv',
            type: 'POST',
            data: {'dst': dst, 'src': src},
            success: function() {
                $('#files').jstree('refresh');
            },
            error: function() {
                console.log('mv error');
            }
        });
    });
});

