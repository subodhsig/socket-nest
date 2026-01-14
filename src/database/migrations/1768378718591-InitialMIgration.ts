import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMIgration1768378718591 implements MigrationInterface {
    name = 'InitialMIgration1768378718591'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`CREATE TABLE "user" ("user_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying(80) NOT NULL, "last_name" character varying(80) NOT NULL, "email" character varying NOT NULL, "password" character varying(255), "phone" character varying(20) NOT NULL, "designation" character varying(120) NOT NULL, "avatar" text, "department_name" character varying(120), "user_role" "public"."user_role_enum" NOT NULL DEFAULT 'USER', "passwordResetToken" character varying(255), "passwordResetExpires" TIMESTAMP WITH TIME ZONE, "profileImage" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_8e1f623798118e629b46a9e6299" UNIQUE ("phone"), CONSTRAINT "PK_758b8ce7c18b9d347461b30228d" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_d2f5e343630bd8b7e1e7534e82e" FOREIGN KEY ("created_by") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_d2f5e343630bd8b7e1e7534e82e"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    }

}
