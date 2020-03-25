import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';
import Mail from '../../lib/Mail';

class AppointmentController {
  async index(req, res) {
    // Listing of appointments sorted by date and not canceled,
    // having their attributes necessary according to the business rule.

    const { page = 1, perPage = 20 } = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled: null },
      order: ['date'],
      limit: perPage, // limit paginate
      offset: (page - 1) * perPage, // how many will skip paging
      attributes: ['id', 'date'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['name', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    // validates whether you are a service provider

    const isProvider = await User.findOne({
      // -> search within the user model a record where you have these conditions
      where: {
        id: provider_id,
        provider: true,
      },
    });

    if (!isProvider) {
      return res.status(401).json({ error: 'Provider does not exist' });
    }

    // if (provider_id === req.userId) {
    //   return res
    //     .status(401)
    //     .json({ error: 'A provider cannot schedule for himself' });
    // }

    const hourStart = startOfHour(parseISO(date)); // parseISO -> transforms into a date object
    // startOfHour -> takes only the beginning of the hour, for example 19:30 it takes 19 only.

    if (isBefore(hourStart, new Date())) {
      // isBefore -> it compares whether the hourStart date is equal to new Date();
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    const user = await User.findByPk(req.userId);

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

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });
    // const checkUserProvider = await User.findOne({
    //   where: { id: req.userId, provider: true },
    // });
    // if (checkUserProvider) {
    //   return res.status(401).json({ error: 'User is a provider.' });
    // }

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment",
      });
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance',
      });
    }

    appointment.canceled = new Date();

    await appointment.save();

    await Mail.sendMail({
      to: `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Agendamento cancelado',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(appointment.date, "' dia' dd 'de' MMMM', às' H:mm'h'", {
          locale: pt,
        }),
      },
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
