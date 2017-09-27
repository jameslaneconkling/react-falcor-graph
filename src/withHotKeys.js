require('rxjs/add/operator/map');


const keyMap = {
  8: 'delete',
  9: 'tab',
  13: 'enter',
  27: 'esc',
  32: 'space',
  33: 'pageup',
  34: 'pagedown',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down'
  // TODO - add letters, numbers, symbols
};


const event2HandlerKey = ({ which, metaKey, altKey, shiftKey }) =>
  `${altKey ? 'alt+' : ''}${shiftKey ? 'shift+' : ''}${metaKey ? 'cmd+' : ''}${keyMap[which]}`;


exports.default = (
  focus = () => true,
  hotKeyHandlers
) => {
  let _props;

  const cachedHotKeyHandlers = {
    onKeyDown: (e) => {
      const key = event2HandlerKey(e);

      if (hotKeyHandlers[key]) {
        hotKeyHandlers[key](_props)(e);
      }
    },
    tabIndex: 0,
    ref: (node) => {
      // TODO - don't focus if node is already focused
      if (node && focus(_props)) {
        node.focus();
      }
    }
  };

  return props$ => props$
    .map((props) => {
      _props = props;
      return Object.assign({}, props, cachedHotKeyHandlers);
    });
};
