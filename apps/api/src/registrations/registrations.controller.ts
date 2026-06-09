import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@vaga-garantida/database';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { RegistrationsService } from './registrations.service';

@ApiTags('registrations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get('mine')
  findMine(@CurrentUser() user: User) {
    return this.registrationsService.findMine(user.id);
  }

  @Post('events/:eventId')
  register(@CurrentUser() user: User, @Param('eventId') eventId: string) {
    return this.registrationsService.register(user.id, eventId);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.registrationsService.cancel(user.id, id);
  }

  @Patch(':id/confirm')
  confirm(@CurrentUser() user: User, @Param('id') id: string) {
    return this.registrationsService.confirm(user.id, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Get('events/:eventId/organizer')
  findForOrganizer(
    @CurrentUser() user: User,
    @Param('eventId') eventId: string,
  ) {
    return this.registrationsService.findForEventOrganizer(user, eventId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Patch(':id/attendance')
  markAttendance(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.registrationsService.markAttendance(user, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Post('process-expired')
  processExpired() {
    return this.registrationsService.processExpiredConfirmations();
  }
}
