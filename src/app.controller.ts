import { Controller, Get, Redirect, Req, Res, Session } from '@nestjs/common';
import type { Request, Response } from 'express';
@Controller()
export class AppController {
  @Get()
  @Redirect('/rooms', 302)
  redirectToRooms(): void {
    return;
  }
  //cookie example
  @Get('set-cookie')
  setDormCookie(@Res({passthrough: true}) response: Response){
    response.cookie('user_role', 'student', {
      httpOnly: true, 
  });
  return {message: 'Đã tạo cookie thành công!'};
}

@Get('get-cookie')
getDormCookie(@Req() request: Request){
  console.log('Cookie nhan duoc: ', request.cookies);
  return{
    allCookies: request.cookies,
    roleNhanDuoc: request.cookies ? request.cookies['user_role'] : null
  };
}

//session example

@Get('test-session')
findAll(@Session() session: Record<string, any>) {
  session.visits = session.visits ? session.visits + 1 : 1;

  return{
    message: "Cài đặt session thành công!",
    visits: session.visits
  };
}

}