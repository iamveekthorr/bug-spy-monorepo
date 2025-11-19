import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Exclude } from 'class-transformer';

import { SCHEMA_OPTIONS } from '~/common/schema-options';

export type UserDocument = HydratedDocument<User>;

@Schema({
  toJSON: { ...SCHEMA_OPTIONS },
  toObject: {
    ...SCHEMA_OPTIONS,
  },
})
export class User {
  _id: string;

  @Prop({ required: true, type: String, unique: true })
  email: string;

  @Exclude({ toPlainOnly: true })
  @Prop({ required: true, type: String, select: false })
  password: string;

  @Prop({
    requred: true,
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free',
  })
  subscription: string = 'free';

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
