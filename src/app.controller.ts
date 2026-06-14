import { Controller, Get, Redirect } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Redirect('/rooms', 302)
  redirectToRooms(): void {
    return;
  }
}
