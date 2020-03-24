import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';

class AppointmentController {
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

    return res.json(appointment);
  }
}
export default new AppointmentController();
