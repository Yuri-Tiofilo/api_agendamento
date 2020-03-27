import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import User from '../models/User';
import Notification from '../schemas/Notification';

class CreateAppointmentService {
  async run({ provider_id, user_id, date }) {
    // validates whether you are a service provider

    const isProvider = await User.findOne({
      // -> search within the user model a record where you have these conditions
      where: {
        id: provider_id,
        provider: true,
      },
    });

    if (!isProvider) {
      throw new Error('Provider does not exist');
    }

    if (provider_id === user_id) {
      throw new Error('A provider cannot schedule for himself');
    }

    const hourStart = startOfHour(parseISO(date)); // parseISO -> transforms into a date object
    // startOfHour -> takes only the beginning of the hour, for example 19:30 it takes 19 only.

    if (isBefore(hourStart, new Date())) {
      // isBefore -> it compares whether the hourStart date is equal to new Date();
      throw new Error('Past dates are not permitted');
    }

    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      throw new Error('Appointment date is not available');
    }

    const appointment = await Appointment.create({
      user_id,
      provider_id,
      date: hourStart,
    });

    const user = await User.findByPk(user_id);

    const formattedDate = format(
      hourStart,
      "' dia' dd 'de' MMMM', às' H:mm'h'",
      {
        locale: pt,
      }
    );

    await Notification.create({
      content: `Novo agendamento de ${user.name} para${formattedDate}`,
      user: provider_id,
    });
    return appointment;
  }
}

export default new CreateAppointmentService();
