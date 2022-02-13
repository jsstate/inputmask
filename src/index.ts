const stringGuard = (value: unknown): value is string => {
  return typeof value === 'string';
};

type ParsedTemplateItem = {
  order?: number;
  isToken: boolean;
  value: string;
};

const TOKEN = 'TOKEN';

const parseTemplate = (template: string[]): ParsedTemplateItem[] => {
  let order = -1;
  return template.map((value) => {
    const isToken = value === TOKEN;

    if (isToken) {
      order += 1;
    }

    return {
      order: isToken ? order : undefined,
      isToken,
      value,
    };
  });
};

const createMaskManager = (parsedTemplate: ParsedTemplateItem[]) => {
  const $template = parsedTemplate.map((item) => ({
    ...item,
    touched: false,
  }));

  const push = (value: string, order: number) => {
    $template.forEach((item) => {
      if (item.order !== order) return;
      item.value = value;
      item.touched = true;
    });
  };

  const join = () => {
    let isReached = false;
    return $template.reduceRight((acc, next) => {
      if (next.touched) {
        isReached = true;
      }

      if (isReached) {
        return `${next.value}${acc}`;
      }

      return acc;
    }, '');
  };

  return {
    push,
    join,
  };
};

type InputMask = {
  mask: (value?: string) => string | undefined;
  unmask: (prevValue?: string, maskedValue?: string) => string | undefined;
};

export const createInputMask = (fn: (token: string) => string[]): InputMask => {
  const template = fn(TOKEN);
  const parsedTemplate = parseTemplate(template);
  const tokensCount = template.reduce((acc, next) => (next === TOKEN ? acc + 1 : acc), 0);

  const cutMasked = (value?: string) => {
    if (!stringGuard(value)) return;
    if (value.length <= parsedTemplate.length) return value;
    return value.slice(0, template.length);
  };

  const cutUnmasked = (value?: string) => {
    if (!stringGuard(value)) return;
    if (value.length <= tokensCount) return value;
    return value.slice(0, tokensCount);
  };

  const getMaskedDiff = (prevMaskedValue: string, maskedValue: string) => {
    return maskedValue.split('').find((value, index) => {
      const prevValue = prevMaskedValue[index];
      return prevValue !== value;
    });
  };

  const mask = (value?: string) => {
    if (!stringGuard(value)) return;
    const maskManager = createMaskManager(parsedTemplate);
    value.split('').forEach(maskManager.push);
    return maskManager.join();
  };

  const unmask = (prevValue?: string, maskedValue?: string) => {
    if (!stringGuard(maskedValue)) return;
    if (!stringGuard(prevValue)) return;

    const prevMaskedValue = mask(prevValue);
    if (!stringGuard(prevMaskedValue)) return;

    if (prevMaskedValue.length === maskedValue.length) {
      return prevValue;
    }

    if (prevMaskedValue.length < maskedValue.length) {
      const newValue = getMaskedDiff(prevMaskedValue, maskedValue);
      if (!stringGuard(newValue)) return;
      return `${prevValue}${newValue}`;
    }

    return prevValue.slice(0, -1);
  };

  return {
    mask: (value?: string) => {
      return cutMasked(mask(value));
    },
    unmask: (prevValue?: string, maskedValue?: string) => {
      return cutUnmasked(unmask(prevValue, maskedValue));
    },
  };
};
