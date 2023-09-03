class Action {
  h;
  constructor(h, fn) {
    this.h = h;
    this.fn = fn;
    this.target = h.$$;
    this.into = this.from = this.to;
    this.and = this.then;
  }

  to(sel) {
    this.target = sel;
    return this;
  }

  then() {
    return this.h;
  }

  on(sel) {
    return this.h.on(sel);
  }
}

const HALT = Symbol('halt');

class Hyper {
  $;
  $$;
  constructor($$, $) {
    this.$$ = $$;
    this.$ = $;
    this.actions = [];
  }

  #ext(fn) {
    let action = new Action(this, fn);
    this.actions.push(action);
    return action;
  }

  #run = async () => {
    let result = null;
    loop: for (const action of this.actions) {
      result = action.fn(result);
      if (result === HALT) {
        break loop;
      } else if (result != null && typeof result.then === 'function') {
        result = await result;
      }
    }
  };

  on(evName) {
    this.$$.on(evName, this.#run);
    return this;
  }

  run(fn) {
    return this.#ext(fn);
  }

  empty(target) {
    const $ = this.$;
    return this.#ext(function () {
      return $(target || this.target).empty();
    });
  }

  addClass(cn) {
    const $ = this.$;
    return this.#ext(function () {
      return $(this.target).addClass(cn);
    });
  }

  removeClass(cn) {
    return this.#ext(function () {
      return $(this.target).removeClass(cn);
    });
  }

  fetch(url, init) {
    return this.#ext(async () => {
      const res = await fetch(url, init);
      return await res.text();
    });
  }

  get(url) {
    return this.fetch(url);
  }

  post(url) {
    return this.fetch(url, { method: 'POST' });
  }

  put() {
    const $ = this.$;
    return this.#ext(function (value) {
      $(this.target).html(value + '');
    });
  }

  when(fn) {
    return this.#ext(() => fn() || HALT).then();
  }

  toggleAttr(attrName, fn) {
    return this.#ext(function () {
      let $$ = $(this.target);
      if (fn()) {
        $$.attr(attrName, '');
      } else {
        $$.removeAttr(attrName);
      }
    });
  }
}

$.fn.hyper = function () {
  return new Hyper(this, $);
};
