import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export const Matcher = (
  property: string,
  validationOptions?: ValidationOptions,
) => {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const relatedPropertyName = args.constraints[0] as string;
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const relatedPropertyName = args.constraints[0] as string;
          return `${relatedPropertyName} and ${args.property} must match`;
        },
      },
    });
  };
};
