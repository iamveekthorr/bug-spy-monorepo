import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

import { KnownDevices } from 'puppeteer';

export function IsValidDevice(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDevice',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: DeviceType, _: ValidationArguments) {
          if (!value) return true; // Optional field
          const validDevices: DeviceType[] = [
            ...Object.keys(KnownDevices),
            'desktop',
            'desktop-hd',
          ];
          return validDevices.includes(value);
        },
        defaultMessage(_: ValidationArguments) {
          const validDevices = [
            ...Object.keys(KnownDevices),
            'desktop',
            'desktop-hd',
          ];
          return `Device type must be one of: ${validDevices.join(', ')}`;
        },
      },
    });
  };
}
