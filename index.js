/**
 * Expose `gingkoImport()`.
 */

module.exports = gingkoImport;

var _ = require('underscore');

//var EXAMPLE = [
//  { type: 'heading', depth: 1, text: 'Alien' },
//  { type: 'paragraph', text: 'The small crew of a deep space ...' },
//  { type: 'heading', depth: 3, text: 'Final Image' }
//]


function current_block(acc) {
  if (!acc.length) {
    acc.push({depth: 1, content: "", paragraphs: []})
  }
  return _.last(acc);
}
function append_to_last_paragraph(acc, text) {
  var block = current_block(acc);
  if (!block.paragraphs.length) {
    block.paragraphs.push("")
  }
  block.paragraphs[block.paragraphs.length - 1] = _.last(block.paragraphs) + text;
}
function create_paragraph(acc, text) {
  current_block(acc).paragraphs.push(text);
}
function as_blocks(tokens) {
  var acc = [];
  _.each(tokens, function(t) {
    switch (t.type) {
      case 'heading':
        acc.push({depth: t.depth, content: t.src.trim(), paragraphs: []});
        break;

      case 'paragraph':
      case 'code':
      case 'list_end':
        if (!t.src) {
          console.warn("Empty src for token: " + t.type);
        }
        create_paragraph(acc, t.src);
        break;

      case 'list_item_start':
      case 'loose_item_start':
      case 'text':
      case 'list_item_end':
      case 'list_start':
        if (t.src) {
          console.warn("Non-empty src for ignored token: " + t.type);
        }
        //ignore, it's included in 'list_start'
        break;

      default:
        // only for development
        console.warn("Unknown marked token: " + t.type);
        if (t.text) {
          append_to_last_paragraph(acc, t.text)
        }
    }
  });
  return acc;
}


function _nested_blocks(blocks, acc, depth) {
  while (blocks.length) {
    var block = _.head(blocks);
    if (block.depth == depth) {
      acc.push(block);
      blocks = _.tail(blocks);
    } else if (block.depth > depth) {
      // go in
      if (!acc.length) {
        acc.push({depth: depth, content: '', paragraphs: []});
      }
      var last = _.last(acc);
      last.children = [];
      blocks = _nested_blocks(blocks, last.children, depth + 1);
    } else {
      // go out
      return blocks;
    }
  }
  return blocks; //empty by now
}

function nested_blocks(blocks) {
  var acc = [];
  var depth = 1;
  _nested_blocks(blocks, acc, depth);
  return acc;
}

function paragraphs_as_blocks(paragraphs) {
  return _.map(paragraphs, function(p) {
    return {content: p.trimRight()}
  })
}
function nested_blocks_to_gingko(n_blocks) {
  return _.map(n_blocks, function(block) {
    var content = block.content;
    var inline_paragraphs = block.children && block.children.length || (block.paragraphs && block.paragraphs.length <= 1);
    if (inline_paragraphs) {
      if (content && block.paragraphs.length) {
        content += '\n\n';
      }
      content += block.paragraphs.join("");
      content = content.trimRight();
    } else {
      block.children = paragraphs_as_blocks(block.paragraphs);
    }
    var o = {content: content};
    if (block.children && block.children.length) {
      o.children = nested_blocks_to_gingko(block.children);
    }
    return o;
  })
}

function gingko_from_marked_tokens(tokens) {

  var blocks = as_blocks(tokens);
  var n_blocks = nested_blocks(blocks);
  return nested_blocks_to_gingko(n_blocks)
}


/**
 * Convert markdown `text` to gingko tree json represenation.
 *
 * @param {String} text - markdown text
 * @return {Array} - json represenation of gingko tree
 * @api public
 */

function gingkoImport(text) {
  var marked = require('./lib/marked');

  var marked_options = {};

  var tokens = marked.lexer(text, marked_options);

  var g = gingko_from_marked_tokens(tokens);
  if (!g.length) {
    return [
      { content: '' }
    ];
  }
  return g;
}

gingkoImport._as_blocks = as_blocks;
