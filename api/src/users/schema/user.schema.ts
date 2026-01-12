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
    required: true,
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free',
  })
  subscription: string = 'free';

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes for common query patterns
UserSchema.index({ email: 1 }); // Already unique, but explicit index for clarity
UserSchema.index({ subscription: 1 }); // Index for subscription queries
UserSchema.index({ createdAt: -1 }); // Index for date-based queries
